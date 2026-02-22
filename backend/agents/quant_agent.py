"""
Quant Agent — orchestrates data fetching, signal generation,
position management, and notifications.
Designed to run as a background asyncio task.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Any

from ..config import settings
from ..models.schemas import StrategyParams, StrategyState, StrategyStatus, AssetClass
from ..strategies.base import Signal
from ..strategies.trend_following import TrendFollowingStrategy
from ..strategies.mean_reversion import MeanReversionStrategy
from ..strategies.event_driven import EventDrivenStrategy
from ..indicators.technical import compute_all
from ..notifications.telegram_bot import notifier
from ..data import crypto, us_stocks, tw_stocks

logger = logging.getLogger(__name__)

STRATEGY_REGISTRY = {
    "trend_following": TrendFollowingStrategy,
    "mean_reversion": MeanReversionStrategy,
    "event_driven": EventDrivenStrategy,
}


class QuantAgent:
    """
    Manages a collection of live strategies.
    Each strategy runs in its own asyncio task.
    """

    def __init__(self):
        self.strategies: Dict[str, StrategyState] = {}
        self._strategy_objs: Dict[str, Any] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        self._alerts: list = []

    # ── Strategy lifecycle ──────────────────────────────────────────────────

    def add_strategy(self, params: StrategyParams) -> StrategyState:
        sid = str(uuid.uuid4())[:8]
        cls = STRATEGY_REGISTRY.get(params.strategy_type.value)
        if cls is None:
            raise ValueError(f"Unknown strategy type: {params.strategy_type}")
        strat_obj = cls(params=params.params)
        state = StrategyState(
            id=sid,
            name=params.name,
            strategy_type=params.strategy_type,
            symbol=params.symbol,
            asset_class=params.asset_class,
            status=StrategyStatus.RUNNING,
            started_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            params={**params.params, "stop_loss_pct": params.stop_loss_pct,
                   "take_profit_pct": params.take_profit_pct,
                   "position_size_pct": params.position_size_pct},
        )
        self.strategies[sid] = state
        self._strategy_objs[sid] = strat_obj
        task = asyncio.create_task(self._run_strategy(sid, params))
        self._tasks[sid] = task
        logger.info(f"Strategy {sid} ({params.name}) started.")
        return state

    def stop_strategy(self, strategy_id: str) -> Optional[StrategyState]:
        if strategy_id not in self.strategies:
            return None
        task = self._tasks.get(strategy_id)
        if task:
            task.cancel()
        self.strategies[strategy_id].status = StrategyStatus.STOPPED
        return self.strategies[strategy_id]

    def update_strategy_params(self, strategy_id: str, new_params: dict) -> Optional[StrategyState]:
        """Hot-reload parameters without restarting the strategy loop."""
        if strategy_id not in self._strategy_objs:
            return None
        strat_obj = self._strategy_objs[strategy_id]
        strat_obj.update_params(new_params)
        self.strategies[strategy_id].params.update(new_params)
        self.strategies[strategy_id].updated_at = datetime.now(timezone.utc)
        return self.strategies[strategy_id]

    def get_all_states(self) -> list[StrategyState]:
        return list(self.strategies.values())

    def get_state(self, strategy_id: str) -> Optional[StrategyState]:
        return self.strategies.get(strategy_id)

    # ── Internal loop ───────────────────────────────────────────────────────

    async def _run_strategy(self, sid: str, params: StrategyParams) -> None:
        strat_obj = self._strategy_objs[sid]
        state = self.strategies[sid]
        interval_map = {
            "1m": 60, "5m": 300, "15m": 900, "30m": 1800,
            "1h": 3600, "4h": 14400, "1d": 86400,
        }
        sleep_sec = interval_map.get(params.timeframe, 3600)

        while state.status == StrategyStatus.RUNNING:
            try:
                df = await self._fetch_data(params)
                if df is None or df.empty:
                    await asyncio.sleep(sleep_sec)
                    continue

                df = compute_all(df)
                signal = strat_obj.generate_signal(df)
                current_price = float(df["close"].iloc[-1])
                state.current_price = current_price
                state.updated_at = datetime.now(timezone.utc)

                await self._handle_signal(sid, signal, current_price, params)

                # Update unrealized PnL
                state.unrealized_pnl = round(strat_obj.unrealized_pnl(current_price), 4)
                state.realized_pnl = round(strat_obj.realized_pnl, 4)
                state.pnl = round(state.realized_pnl + state.unrealized_pnl, 4)
                state.position = strat_obj.position

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Strategy {sid} error: {e}", exc_info=True)
                state.status = StrategyStatus.ERROR
                await notifier.send_alert(
                    f"Strategy Error [{sid}]",
                    f"Symbol: {params.symbol}\nError: {str(e)}",
                    level="CRITICAL",
                )
                break

            await asyncio.sleep(sleep_sec)

    async def _fetch_data(self, params: StrategyParams):
        try:
            if params.asset_class == AssetClass.CRYPTO:
                return await crypto.fetch_ohlcv_async(
                    params.symbol, params.timeframe, limit=500
                )
            elif params.asset_class == AssetClass.US_STOCK:
                return us_stocks.fetch_ohlcv_yfinance(params.symbol, period="6mo")
            elif params.asset_class == AssetClass.TW_STOCK:
                return tw_stocks.fetch_daily_ohlcv(params.symbol)
        except Exception as e:
            logger.error(f"Data fetch error: {e}")
            return None

    async def _handle_signal(
        self, sid: str, signal: Signal, price: float, params: StrategyParams
    ) -> None:
        state = self.strategies[sid]
        strat_obj = self._strategy_objs[sid]

        if signal == Signal.BUY and state.position == 0:
            state.position = 1.0
            state.entry_price = price
            state.num_trades += 1
            strat_obj.on_fill(price, 1.0, "buy")
            await notifier.send_trade_alert(
                symbol=params.symbol,
                side="BUY",
                price=price,
                quantity=1.0,
                strategy=state.name,
            )

        elif signal in (Signal.SELL, Signal.CLOSE_LONG) and state.position > 0:
            pnl = strat_obj.unrealized_pnl(price)
            strat_obj.on_fill(price, abs(state.position), "sell")
            state.position = 0
            state.entry_price = None
            await notifier.send_trade_alert(
                symbol=params.symbol,
                side="SELL",
                price=price,
                quantity=1.0,
                strategy=state.name,
                pnl=pnl,
            )

    # ── Telegram command callbacks ──────────────────────────────────────────

    async def status_summary(self) -> str:
        if not self.strategies:
            return "No strategies running."
        lines = ["*Running Strategies*\n"]
        for sid, state in self.strategies.items():
            emoji = {"running": "🟢", "paused": "🟡", "stopped": "🔴", "error": "⛔"}.get(
                state.status.value, "❓"
            )
            lines.append(
                f"{emoji} `{sid}` *{state.name}*\n"
                f"  Symbol: `{state.symbol}` | Pos: `{state.position:.4f}`\n"
                f"  PnL: `{state.pnl:+.2f}` | Price: `{state.current_price:.4f}`\n"
            )
        return "\n".join(lines)

    async def emergency_stop(self, strategy_id: str) -> str:
        result = self.stop_strategy(strategy_id)
        if result:
            return f"Strategy `{strategy_id}` stopped."
        return f"Strategy `{strategy_id}` not found."


# Singleton agent
agent = QuantAgent()
