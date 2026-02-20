"""
Mean-Reversion Strategy
=======================
Logic:
  - Use z-score (rolling 20-period) of close price.
  - Enter LONG when z-score < -2 (oversold) AND RSI < 30 AND BB%B < 0.
  - Enter SHORT when z-score > +2 (overbought) AND RSI > 70 AND BB%B > 1.
  - Exit when z-score reverts to 0 ± 0.5.
"""
import pandas as pd
from typing import Dict, Any
from .base import BaseStrategy, Signal
from ..indicators.technical import rsi, bollinger_bands, z_score


class MeanReversionStrategy(BaseStrategy):

    DEFAULT_PARAMS = {
        "lookback": 20,
        "z_entry": 2.0,
        "z_exit": 0.5,
        "rsi_period": 14,
        "rsi_oversold": 30,
        "rsi_overbought": 70,
        "stop_loss_pct": 0.03,
        "take_profit_pct": 0.06,
    }

    def __init__(self, params: Dict[str, Any] = {}):
        merged = {**self.DEFAULT_PARAMS, **params}
        super().__init__(merged)

    @property
    def name(self) -> str:
        return "Mean Reversion (Z-Score / BB / RSI)"

    def generate_signal(self, df: pd.DataFrame) -> Signal:
        p = self.params
        close = df["close"]

        z = z_score(close, p["lookback"])
        rsi_val = rsi(close, p["rsi_period"])
        _, _, _, pct_b = bollinger_bands(close)

        last_z = z.iloc[-1]
        last_rsi = rsi_val.iloc[-1]
        last_pct = pct_b.iloc[-1]

        # Exit logic for open positions
        if self.position > 0:
            pnl_pct = (close.iloc[-1] - self.entry_price) / self.entry_price if self.entry_price else 0
            if (
                abs(last_z) < p["z_exit"]
                or pnl_pct <= -p["stop_loss_pct"]
                or pnl_pct >= p["take_profit_pct"]
            ):
                return Signal.CLOSE_LONG

        if self.position < 0:
            pnl_pct = (self.entry_price - close.iloc[-1]) / self.entry_price if self.entry_price else 0
            if (
                abs(last_z) < p["z_exit"]
                or pnl_pct <= -p["stop_loss_pct"]
                or pnl_pct >= p["take_profit_pct"]
            ):
                return Signal.CLOSE_SHORT

        # Entry logic
        if (
            last_z < -p["z_entry"]
            and last_rsi < p["rsi_oversold"]
            and last_pct < 0.05
            and self.position == 0
        ):
            return Signal.BUY

        if (
            last_z > p["z_entry"]
            and last_rsi > p["rsi_overbought"]
            and last_pct > 0.95
            and self.position == 0
        ):
            return Signal.SELL

        return Signal.HOLD
