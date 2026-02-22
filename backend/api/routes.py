"""
FastAPI REST routes.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt

from ..config import settings
from ..models.schemas import (
    Token,
    LoginRequest,
    StrategyParams,
    StrategyState,
    UpdateStrategyParams,
    BacktestRequest,
    BacktestResult,
    IndicatorSnapshot,
    PortfolioSnapshot,
    Alert,
    AssetClass,
)
from ..agents.quant_agent import agent
from ..backtest.engine import BacktestEngine, BacktestConfig
from ..strategies.trend_following import TrendFollowingStrategy
from ..strategies.mean_reversion import MeanReversionStrategy
from ..strategies.event_driven import EventDrivenStrategy
from ..indicators.technical import compute_all
from ..data import crypto, us_stocks, tw_stocks

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Auth ───────────────────────────────────────────────────────────────────

DEMO_USERS = {"admin": "quantadmin2024", "trader": "tradersecret"}


def create_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/auth/login", response_model=Token, tags=["Auth"])
async def login(form: OAuth2PasswordRequestForm = Depends()):
    pwd = DEMO_USERS.get(form.username)
    if pwd is None or pwd != form.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_token(form.username))


@router.post("/auth/token", response_model=Token, tags=["Auth"])
async def login_json(body: LoginRequest):
    pwd = DEMO_USERS.get(body.username)
    if pwd is None or pwd != body.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_token(body.username))


# ── Strategies ─────────────────────────────────────────────────────────────

@router.post("/strategies", response_model=StrategyState, tags=["Strategies"])
async def create_strategy(params: StrategyParams):
    """Deploy a new strategy to the quant agent."""
    try:
        return agent.add_strategy(params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/strategies", response_model=List[StrategyState], tags=["Strategies"])
async def list_strategies():
    return agent.get_all_states()


@router.get("/strategies/{strategy_id}", response_model=StrategyState, tags=["Strategies"])
async def get_strategy(strategy_id: str):
    state = agent.get_state(strategy_id)
    if not state:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return state


@router.patch("/strategies/{strategy_id}", response_model=StrategyState, tags=["Strategies"])
async def update_strategy(strategy_id: str, body: UpdateStrategyParams):
    """Hot-reload strategy parameters without restarting."""
    updates = body.model_dump(exclude_none=True)
    if "params" in updates:
        updates.update(updates.pop("params"))
    result = agent.update_strategy_params(strategy_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return result


@router.delete("/strategies/{strategy_id}", tags=["Strategies"])
async def stop_strategy(strategy_id: str):
    """Emergency stop — closes all positions and halts the strategy."""
    result = agent.stop_strategy(strategy_id)
    if not result:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"message": f"Strategy {strategy_id} stopped.", "status": result.status}


# ── Market data ────────────────────────────────────────────────────────────

@router.get("/market/ohlcv", tags=["Market Data"])
async def get_ohlcv(
    symbol: str,
    asset_class: AssetClass = AssetClass.CRYPTO,
    timeframe: str = "1h",
    limit: int = Query(default=200, le=1000),
):
    try:
        if asset_class == AssetClass.CRYPTO:
            df = await crypto.fetch_ohlcv_async(symbol, timeframe, limit)
        elif asset_class == AssetClass.US_STOCK:
            df = us_stocks.fetch_ohlcv_yfinance(symbol)
        elif asset_class == AssetClass.TW_STOCK:
            df = tw_stocks.fetch_daily_ohlcv(symbol)
        else:
            raise HTTPException(status_code=400, detail="Unsupported asset class")

        df = df.tail(limit)
        records = []
        for ts, row in df.iterrows():
            records.append({
                "timestamp": str(ts),
                "open": round(float(row["open"]), 6),
                "high": round(float(row["high"]), 6),
                "low": round(float(row["low"]), 6),
                "close": round(float(row["close"]), 6),
                "volume": round(float(row["volume"]), 2),
            })
        return {"symbol": symbol, "timeframe": timeframe, "data": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market/indicators", response_model=IndicatorSnapshot, tags=["Market Data"])
async def get_indicators(
    symbol: str,
    asset_class: AssetClass = AssetClass.CRYPTO,
    timeframe: str = "1h",
):
    try:
        if asset_class == AssetClass.CRYPTO:
            df = await crypto.fetch_ohlcv_async(symbol, timeframe, limit=300)
        elif asset_class == AssetClass.US_STOCK:
            df = us_stocks.fetch_ohlcv_yfinance(symbol, period="1y")
        else:
            df = tw_stocks.fetch_daily_ohlcv(symbol)

        df = compute_all(df)
        last = df.iloc[-1]

        return IndicatorSnapshot(
            symbol=symbol,
            timestamp=df.index[-1],
            close=round(float(last["close"]), 6),
            rsi_14=round(float(last.get("rsi_14", 0)), 2),
            macd=round(float(last.get("macd", 0)), 6),
            macd_signal=round(float(last.get("macd_signal", 0)), 6),
            macd_hist=round(float(last.get("macd_hist", 0)), 6),
            bb_upper=round(float(last.get("bb_upper", 0)), 6),
            bb_middle=round(float(last.get("bb_middle", 0)), 6),
            bb_lower=round(float(last.get("bb_lower", 0)), 6),
            bb_pct=round(float(last.get("bb_pct", 0)), 4),
            atr_14=round(float(last.get("atr_14", 0)), 6),
            adx=round(float(last.get("adx", 0)), 2),
            z_score=round(float(last.get("z_score_20", 0)), 4),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/market/ticker", tags=["Market Data"])
async def get_ticker(symbol: str, exchange: str = "binance"):
    try:
        ex = crypto.get_exchange(exchange)
        ticker = ex.fetch_ticker(symbol)
        return {
            "symbol": symbol,
            "price": ticker["last"],
            "bid": ticker["bid"],
            "ask": ticker["ask"],
            "volume_24h": ticker["baseVolume"],
            "change_pct_24h": ticker.get("percentage", 0),
            "high_24h": ticker.get("high"),
            "low_24h": ticker.get("low"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Backtest ────────────────────────────────────────────────────────────────

STRAT_MAP = {
    "trend_following": TrendFollowingStrategy,
    "mean_reversion": MeanReversionStrategy,
    "event_driven": EventDrivenStrategy,
}


@router.post("/backtest/run", tags=["Backtest"])
async def run_backtest(req: BacktestRequest):
    """Run a full backtest and return performance metrics + equity curve."""
    try:
        # Fetch data
        if req.asset_class == AssetClass.CRYPTO:
            df = await crypto.fetch_ohlcv_async(req.symbol, req.timeframe, limit=1000)
        elif req.asset_class == AssetClass.US_STOCK:
            df = us_stocks.fetch_ohlcv_yfinance(req.symbol, period="5y")
        else:
            df = tw_stocks.fetch_daily_ohlcv(req.symbol)

        # Filter date range
        df = df[(df.index >= str(req.start_date)) & (df.index <= str(req.end_date))]
        if len(df) < 50:
            raise HTTPException(status_code=400, detail="Insufficient data for backtest")

        # Build strategy + engine
        cls = STRAT_MAP.get(req.strategy_type.value)
        if not cls:
            raise HTTPException(status_code=400, detail="Unknown strategy type")
        strategy = cls(params=req.params)
        cfg = BacktestConfig(
            initial_capital=req.initial_capital,
            commission=req.commission,
            slippage=req.slippage,
        )
        engine = BacktestEngine(strategy, cfg)
        result = engine.run(df)

        return {
            "request": req.model_dump(mode="json"),
            **result,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Portfolio ────────────────────────────────────────────────────────────────

@router.get("/portfolio", response_model=PortfolioSnapshot, tags=["Portfolio"])
async def get_portfolio():
    """Aggregate portfolio snapshot across all running strategies."""
    states = agent.get_all_states()
    total_pnl = sum(s.pnl for s in states)
    positions = []
    return PortfolioSnapshot(
        timestamp=datetime.now(timezone.utc),
        total_equity=100_000 + total_pnl,
        cash=100_000,
        invested=0,
        total_pnl=round(total_pnl, 2),
        total_pnl_pct=round(total_pnl / 100_000 * 100, 4),
        daily_pnl=0,
        daily_pnl_pct=0,
        var_95=0,
        positions=positions,
    )
