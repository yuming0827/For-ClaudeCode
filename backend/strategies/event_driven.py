"""
Event-Driven Strategy
=====================
Triggers on external events:
  - Abnormal volume surge (> N × average volume)
  - Large crypto on-chain transfers (whale alert proxy via exchange inflow)
  - Taiwan stock 3-major-institutions net buying/selling threshold
  - US stock earnings surprise proxy (price gap on earnings day)
"""
import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime
from .base import BaseStrategy, Signal


class EventDrivenStrategy(BaseStrategy):

    DEFAULT_PARAMS = {
        "volume_surge_mult": 3.0,       # trigger if volume > N × 20-bar avg
        "volume_lookback": 20,
        "price_gap_threshold_pct": 0.03,  # trigger on 3%+ gap open
        "institutional_threshold": 5_000_000,  # TWD net buying (TW stocks)
        "whale_transfer_threshold": 500,  # BTC equivalent threshold
        "stop_loss_pct": 0.025,
        "take_profit_pct": 0.05,
    }

    def __init__(self, params: Dict[str, Any] = {}):
        merged = {**self.DEFAULT_PARAMS, **params}
        super().__init__(merged)
        self._pending_event: Optional[dict] = None

    @property
    def name(self) -> str:
        return "Event-Driven (Volume Surge / Gap / Institutional)"

    def inject_event(self, event: dict) -> None:
        """
        External caller injects events (whale alert, institutional data, etc.)
        event = {"type": "whale_buy", "magnitude": 1200, ...}
        """
        self._pending_event = event

    def generate_signal(self, df: pd.DataFrame) -> Signal:
        p = self.params
        close = df["close"]
        volume = df["volume"]
        last_close = close.iloc[-1]
        prev_close = close.iloc[-2]
        last_vol = volume.iloc[-1]
        avg_vol = volume.iloc[-p["volume_lookback"] - 1 : -1].mean()

        # ── Stop-loss / take-profit for open positions ──────────────────────
        if self.position != 0 and self.entry_price:
            direction = 1 if self.position > 0 else -1
            pnl_pct = direction * (last_close - self.entry_price) / self.entry_price
            if pnl_pct <= -p["stop_loss_pct"] or pnl_pct >= p["take_profit_pct"]:
                return Signal.CLOSE_LONG if self.position > 0 else Signal.CLOSE_SHORT

        # ── Volume surge ────────────────────────────────────────────────────
        if last_vol > p["volume_surge_mult"] * avg_vol and avg_vol > 0:
            gap_pct = (last_close - prev_close) / prev_close
            if gap_pct > p["price_gap_threshold_pct"] and self.position == 0:
                return Signal.BUY
            if gap_pct < -p["price_gap_threshold_pct"] and self.position == 0:
                return Signal.SELL

        # ── External events ─────────────────────────────────────────────────
        if self._pending_event:
            evt = self._pending_event
            self._pending_event = None  # consume event
            if evt.get("type") == "whale_buy" and self.position == 0:
                return Signal.BUY
            if evt.get("type") == "whale_sell" and self.position == 0:
                return Signal.SELL
            if evt.get("type") == "institutional_buy" and self.position == 0:
                return Signal.BUY
            if evt.get("type") == "institutional_sell" and self.position == 0:
                return Signal.SELL

        return Signal.HOLD
