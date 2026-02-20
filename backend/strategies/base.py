"""
Abstract base strategy.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import pandas as pd
from enum import Enum


class Signal(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"
    CLOSE_LONG = "CLOSE_LONG"
    CLOSE_SHORT = "CLOSE_SHORT"


class BaseStrategy(ABC):
    """All concrete strategies must inherit from this class."""

    def __init__(self, params: Dict[str, Any]):
        self.params = params
        self.position: float = 0.0          # positive = long, negative = short
        self.entry_price: Optional[float] = None
        self.realized_pnl: float = 0.0
        self.trades: list = []

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable strategy name."""

    @abstractmethod
    def generate_signal(self, df: pd.DataFrame) -> Signal:
        """
        Given a prepared OHLCV+indicators DataFrame (most recent bar last),
        return a trading signal.
        """

    def update_params(self, new_params: Dict[str, Any]) -> None:
        """Hot-reload strategy parameters without restarting the agent."""
        self.params.update(new_params)

    def on_fill(self, price: float, qty: float, side: str) -> None:
        """Called when an order is filled. Updates internal state."""
        if side == "buy":
            if self.position == 0:
                self.entry_price = price
            self.position += qty
        elif side == "sell":
            if self.position > 0 and self.entry_price:
                self.realized_pnl += (price - self.entry_price) * min(qty, self.position)
            self.position -= qty
            if self.position == 0:
                self.entry_price = None

    def unrealized_pnl(self, current_price: float) -> float:
        if self.position == 0 or self.entry_price is None:
            return 0.0
        return (current_price - self.entry_price) * self.position
