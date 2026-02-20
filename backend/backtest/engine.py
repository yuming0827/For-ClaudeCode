"""
Event-driven backtesting engine.
Supports minute, hour, and daily bars.
Accounts for commission, slippage, and position sizing.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime

import numpy as np
import pandas as pd

from ..strategies.base import BaseStrategy, Signal
from ..indicators.technical import compute_all
from .performance import compute_metrics

logger = logging.getLogger(__name__)


@dataclass
class BacktestConfig:
    initial_capital: float = 100_000.0
    commission: float = 0.001       # 0.1%
    slippage: float = 0.0005        # 0.05%
    position_size_pct: float = 0.1  # 10% of capital per trade
    allow_short: bool = True
    min_bars: int = 250             # warm-up bars required for indicators


@dataclass
class _Trade:
    entry_bar: int
    entry_time: datetime
    side: str  # "long" | "short"
    entry_price: float
    quantity: float
    exit_bar: Optional[int] = None
    exit_time: Optional[datetime] = None
    exit_price: Optional[float] = None
    commission_paid: float = 0.0

    @property
    def is_closed(self) -> bool:
        return self.exit_price is not None

    @property
    def pnl(self) -> float:
        if not self.is_closed or self.exit_price is None:
            return 0.0
        if self.side == "long":
            return (self.exit_price - self.entry_price) * self.quantity - self.commission_paid
        else:
            return (self.entry_price - self.exit_price) * self.quantity - self.commission_paid

    @property
    def pnl_pct(self) -> float:
        cost = self.entry_price * self.quantity
        return self.pnl / cost if cost > 0 else 0.0


class BacktestEngine:
    def __init__(self, strategy: BaseStrategy, config: BacktestConfig = BacktestConfig()):
        self.strategy = strategy
        self.config = config

    def _apply_slippage(self, price: float, side: str) -> float:
        """Widen price to simulate market impact."""
        factor = 1 + self.config.slippage if side == "buy" else 1 - self.config.slippage
        return price * factor

    def run(self, df_raw: pd.DataFrame) -> Dict[str, Any]:
        """
        Execute the backtest on a prepared OHLCV DataFrame.
        Returns a dict compatible with BacktestResult schema.
        """
        df = compute_all(df_raw.copy())
        cfg = self.config

        capital = cfg.initial_capital
        cash = capital
        equity_curve: List[Dict] = []
        trades: List[_Trade] = []
        open_trade: Optional[_Trade] = None

        bars = list(df.iterrows())

        for i, (ts, row) in enumerate(bars):
            if i < cfg.min_bars:
                equity_curve.append({"timestamp": str(ts), "equity": cash})
                continue

            current_df = df.iloc[: i + 1]
            price = float(row["close"])

            # ── Generate signal ────────────────────────────────────────────
            try:
                signal = self.strategy.generate_signal(current_df)
            except Exception as e:
                logger.warning(f"Signal error at {ts}: {e}")
                signal = Signal.HOLD

            # ── Execute orders ─────────────────────────────────────────────
            if signal in (Signal.CLOSE_LONG, Signal.SELL) and open_trade and open_trade.side == "long":
                exit_price = self._apply_slippage(price, "sell")
                comm = exit_price * open_trade.quantity * cfg.commission
                open_trade.exit_bar = i
                open_trade.exit_time = ts
                open_trade.exit_price = exit_price
                open_trade.commission_paid += comm
                cash += exit_price * open_trade.quantity - comm
                trades.append(open_trade)
                open_trade = None
                self.strategy.position = 0.0

            elif signal in (Signal.CLOSE_SHORT, Signal.BUY) and open_trade and open_trade.side == "short":
                exit_price = self._apply_slippage(price, "buy")
                comm = exit_price * open_trade.quantity * cfg.commission
                open_trade.exit_bar = i
                open_trade.exit_time = ts
                open_trade.exit_price = exit_price
                open_trade.commission_paid += comm
                # For short: profit when price fell
                cash += (open_trade.entry_price - exit_price) * open_trade.quantity - comm
                trades.append(open_trade)
                open_trade = None
                self.strategy.position = 0.0

            if signal == Signal.BUY and open_trade is None:
                entry_price = self._apply_slippage(price, "buy")
                position_value = cash * cfg.position_size_pct
                quantity = position_value / entry_price
                comm = entry_price * quantity * cfg.commission
                if cash >= position_value + comm:
                    cash -= position_value + comm
                    open_trade = _Trade(
                        entry_bar=i,
                        entry_time=ts,
                        side="long",
                        entry_price=entry_price,
                        quantity=quantity,
                        commission_paid=comm,
                    )
                    self.strategy.position = quantity

            elif signal == Signal.SELL and open_trade is None and cfg.allow_short:
                entry_price = self._apply_slippage(price, "sell")
                position_value = cash * cfg.position_size_pct
                quantity = position_value / entry_price
                comm = entry_price * quantity * cfg.commission
                cash -= comm  # margin cost approximation
                open_trade = _Trade(
                    entry_bar=i,
                    entry_time=ts,
                    side="short",
                    entry_price=entry_price,
                    quantity=quantity,
                    commission_paid=comm,
                )
                self.strategy.position = -quantity

            # ── Mark-to-market equity ──────────────────────────────────────
            unrealized = 0.0
            if open_trade:
                if open_trade.side == "long":
                    unrealized = (price - open_trade.entry_price) * open_trade.quantity
                else:
                    unrealized = (open_trade.entry_price - price) * open_trade.quantity

            total_equity = cash + unrealized
            equity_curve.append({"timestamp": str(ts), "equity": round(total_equity, 2)})

        # Close any remaining open position at last bar
        if open_trade and len(bars) > 0:
            last_ts, last_row = bars[-1]
            last_price = float(last_row["close"])
            open_trade.exit_bar = len(bars) - 1
            open_trade.exit_time = last_ts
            open_trade.exit_price = last_price
            trades.append(open_trade)

        # ── Compute performance metrics ────────────────────────────────────
        eq_series = pd.Series(
            [e["equity"] for e in equity_curve],
            index=[e["timestamp"] for e in equity_curve],
        )
        metrics = compute_metrics(eq_series, trades, cfg.initial_capital)
        metrics["equity_curve"] = equity_curve
        metrics["trades"] = [
            {
                "entry_time": str(t.entry_time),
                "exit_time": str(t.exit_time) if t.exit_time else None,
                "side": t.side,
                "entry_price": t.entry_price,
                "exit_price": t.exit_price,
                "quantity": t.quantity,
                "pnl": round(t.pnl, 4),
                "pnl_pct": round(t.pnl_pct * 100, 4),
                "commission": round(t.commission_paid, 4),
            }
            for t in trades
        ]
        return metrics
