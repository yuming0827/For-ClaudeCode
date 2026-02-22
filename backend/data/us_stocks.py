"""
US stock market data via Yahoo Finance (yfinance).
"""
import logging

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


def fetch_ohlcv_yfinance(
    symbol: str,
    period: str = "1y",
    interval: str = "1d",
) -> pd.DataFrame:
    """
    Fetch OHLCV data from Yahoo Finance.

    Args:
        symbol:   Ticker symbol (e.g. "AAPL", "TSLA").
        period:   Lookback period string accepted by yfinance (e.g. "1y", "6mo", "5y").
        interval: Bar interval (e.g. "1d", "1h", "5m").

    Returns:
        DataFrame with columns [open, high, low, close, volume] and a DatetimeIndex.
    """
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval, auto_adjust=True)

    if df.empty:
        raise ValueError(f"No data returned for {symbol} from Yahoo Finance")

    # Normalise column names to lowercase
    df.columns = [c.lower() for c in df.columns]
    df.index.name = "timestamp"

    # Keep only OHLCV
    cols = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
    return df[cols]
