"""
Pydantic schemas for request / response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────────

class AssetClass(str, Enum):
    CRYPTO = "crypto"
    US_STOCK = "us_stock"
    TW_STOCK = "tw_stock"


class StrategyType(str, Enum):
    TREND_FOLLOWING = "trend_following"
    MEAN_REVERSION = "mean_reversion"
    EVENT_DRIVEN = "event_driven"
    STAT_ARB = "stat_arb"


class StrategyStatus(str, Enum):
    RUNNING = "running"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


# ── Auth ───────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


# ── Market Data ────────────────────────────────────────────────────────────

class OHLCV(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class Ticker(BaseModel):
    symbol: str
    price: float
    change_pct: float
    volume: float
    timestamp: datetime


# ── Strategy ───────────────────────────────────────────────────────────────

class StrategyParams(BaseModel):
    """Generic parameter container — strategy-specific fields are dynamic."""
    name: str
    strategy_type: StrategyType
    asset_class: AssetClass
    symbol: str
    timeframe: str = "1h"
    params: Dict[str, Any] = {}
    stop_loss_pct: float = Field(default=0.02, ge=0.001, le=0.5)
    take_profit_pct: float = Field(default=0.04, ge=0.001, le=2.0)
    position_size_pct: float = Field(default=0.1, ge=0.01, le=1.0)


class StrategyState(BaseModel):
    id: str
    name: str
    strategy_type: StrategyType
    symbol: str
    asset_class: AssetClass
    status: StrategyStatus
    pnl: float = 0.0
    pnl_pct: float = 0.0
    position: float = 0.0
    entry_price: Optional[float] = None
    current_price: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    num_trades: int = 0
    win_rate: float = 0.0
    sharpe_ratio: float = 0.0
    max_drawdown: float = 0.0
    var_95: float = 0.0
    started_at: datetime
    updated_at: datetime
    params: Dict[str, Any] = {}


class UpdateStrategyParams(BaseModel):
    stop_loss_pct: Optional[float] = None
    take_profit_pct: Optional[float] = None
    position_size_pct: Optional[float] = None
    params: Optional[Dict[str, Any]] = None


# ── Backtest ───────────────────────────────────────────────────────────────

class BacktestRequest(BaseModel):
    strategy_type: StrategyType
    asset_class: AssetClass
    symbol: str
    timeframe: str = "1d"
    start_date: datetime
    end_date: datetime
    initial_capital: float = Field(default=100_000.0, ge=1_000)
    commission: float = Field(default=0.001, ge=0, le=0.05)
    slippage: float = Field(default=0.0005, ge=0, le=0.01)
    params: Dict[str, Any] = {}


class Trade(BaseModel):
    entry_time: datetime
    exit_time: Optional[datetime]
    side: OrderSide
    entry_price: float
    exit_price: Optional[float]
    quantity: float
    pnl: float = 0.0
    pnl_pct: float = 0.0
    commission: float = 0.0


class BacktestResult(BaseModel):
    request: BacktestRequest
    trades: List[Trade]
    equity_curve: List[Dict[str, Any]]   # [{timestamp, equity}]
    drawdown_curve: List[Dict[str, Any]] # [{timestamp, drawdown}]
    # Performance metrics
    total_return_pct: float
    annual_return_pct: float
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    max_drawdown_pct: float
    win_rate: float
    profit_factor: float
    avg_trade_pct: float
    num_trades: int
    num_wins: int
    num_losses: int
    best_trade_pct: float
    worst_trade_pct: float
    avg_holding_days: float
    var_95: float
    cvar_95: float


# ── Indicators ─────────────────────────────────────────────────────────────

class IndicatorSnapshot(BaseModel):
    symbol: str
    timestamp: datetime
    close: float
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_middle: Optional[float] = None
    bb_lower: Optional[float] = None
    bb_pct: Optional[float] = None
    vwap: Optional[float] = None
    atr_14: Optional[float] = None
    adx: Optional[float] = None
    z_score: Optional[float] = None
    vol_squeeze: Optional[bool] = None


# ── Portfolio ──────────────────────────────────────────────────────────────

class Position(BaseModel):
    symbol: str
    asset_class: AssetClass
    side: OrderSide
    quantity: float
    avg_entry_price: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float


class PortfolioSnapshot(BaseModel):
    timestamp: datetime
    total_equity: float
    cash: float
    invested: float
    total_pnl: float
    total_pnl_pct: float
    daily_pnl: float
    daily_pnl_pct: float
    var_95: float
    positions: List[Position]


# ── Notifications ──────────────────────────────────────────────────────────

class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Alert(BaseModel):
    id: str
    level: AlertLevel
    title: str
    message: str
    symbol: Optional[str] = None
    strategy_id: Optional[str] = None
    timestamp: datetime
    acknowledged: bool = False
