"""
Trend-Following Strategy
========================
Logic:
  - Enter LONG when fast EMA crosses above slow EMA AND price > EMA200 AND ADX > 25.
  - Enter SHORT when fast EMA crosses below slow EMA AND price < EMA200 AND ADX > 25.
  - Exit when opposite crossover or stop-loss / take-profit triggered.
  - Optional: ATR trailing stop.
"""
import pandas as pd
from typing import Dict, Any
from .base import BaseStrategy, Signal
from ..indicators.technical import ema, atr, adx


class TrendFollowingStrategy(BaseStrategy):

    DEFAULT_PARAMS = {
        "ema_fast": 20,
        "ema_slow": 50,
        "ema_trend": 200,
        "adx_period": 14,
        "adx_threshold": 25.0,
        "atr_period": 14,
        "use_atr_stop": True,
        "atr_stop_mult": 2.0,
        "stop_loss_pct": 0.02,
        "take_profit_pct": 0.04,
    }

    def __init__(self, params: Dict[str, Any] = {}):
        merged = {**self.DEFAULT_PARAMS, **params}
        super().__init__(merged)

    @property
    def name(self) -> str:
        return "Trend Following (EMA/ADX/ATR)"

    def generate_signal(self, df: pd.DataFrame) -> Signal:
        p = self.params
        close = df["close"]

        fast = ema(close, p["ema_fast"])
        slow = ema(close, p["ema_slow"])
        trend = ema(close, p["ema_trend"])
        adx_val = adx(df, p["adx_period"])

        last = -1
        prev = -2

        fast_above_slow = fast.iloc[last] > slow.iloc[last]
        fast_was_below = fast.iloc[prev] <= slow.iloc[prev]
        fast_below_slow = fast.iloc[last] < slow.iloc[last]
        fast_was_above = fast.iloc[prev] >= slow.iloc[prev]

        above_trend = close.iloc[last] > trend.iloc[last]
        below_trend = close.iloc[last] < trend.iloc[last]
        strong_trend = adx_val.iloc[last] > p["adx_threshold"]

        # Check stop-loss / take-profit for open positions
        if self.position > 0 and self.entry_price:
            pnl_pct = (close.iloc[last] - self.entry_price) / self.entry_price
            if pnl_pct <= -p["stop_loss_pct"] or pnl_pct >= p["take_profit_pct"]:
                return Signal.CLOSE_LONG
            if p["use_atr_stop"]:
                atr_val = atr(df, p["atr_period"]).iloc[last]
                stop = self.entry_price - p["atr_stop_mult"] * atr_val
                if close.iloc[last] < stop:
                    return Signal.CLOSE_LONG

        # Golden cross → BUY
        if fast_above_slow and fast_was_below and above_trend and strong_trend:
            if self.position <= 0:
                return Signal.BUY

        # Death cross → SELL / SHORT
        if fast_below_slow and fast_was_above and below_trend and strong_trend:
            if self.position >= 0:
                return Signal.SELL

        return Signal.HOLD
