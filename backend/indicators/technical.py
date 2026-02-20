"""
Core technical indicators computed on pandas DataFrames.
All functions expect a DataFrame with columns: open, high, low, close, volume.
"""
import numpy as np
import pandas as pd
from typing import Optional


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def macd(
    close: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> tuple[pd.Series, pd.Series, pd.Series]:
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def bollinger_bands(
    close: pd.Series,
    period: int = 20,
    std_dev: float = 2.0,
) -> tuple[pd.Series, pd.Series, pd.Series, pd.Series]:
    middle = close.rolling(period).mean()
    std = close.rolling(period).std()
    upper = middle + std_dev * std
    lower = middle - std_dev * std
    pct_b = (close - lower) / (upper - lower)
    return upper, middle, lower, pct_b


def vwap(df: pd.DataFrame) -> pd.Series:
    """VWAP resets per day."""
    typical = (df["high"] + df["low"] + df["close"]) / 3
    df = df.copy()
    df["date"] = pd.to_datetime(df.index).normalize()
    df["_tp"] = typical
    df["_tpv"] = typical * df["volume"]
    cum_tpv = df.groupby("date")["_tpv"].cumsum()
    cum_vol = df.groupby("date")["volume"].cumsum()
    return cum_tpv / cum_vol


def atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high = df["high"]
    low = df["low"]
    prev_close = df["close"].shift(1)
    tr = pd.concat(
        [high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1
    ).max(axis=1)
    return tr.ewm(com=period - 1, min_periods=period).mean()


def adx(df: pd.DataFrame, period: int = 14) -> pd.Series:
    high = df["high"]
    low = df["low"]
    close = df["close"]
    prev_high = high.shift(1)
    prev_low = low.shift(1)

    plus_dm = (high - prev_high).clip(lower=0)
    minus_dm = (prev_low - low).clip(lower=0)
    mask = (high - prev_high) < (prev_low - low)
    plus_dm[mask] = 0
    mask2 = (prev_low - low) <= (high - prev_high)
    minus_dm[mask2] = 0

    tr = atr(df, period)
    plus_di = 100 * plus_dm.ewm(com=period - 1, min_periods=period).mean() / tr
    minus_di = 100 * minus_dm.ewm(com=period - 1, min_periods=period).mean() / tr
    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di)
    return dx.ewm(com=period - 1, min_periods=period).mean()


def ema(close: pd.Series, period: int) -> pd.Series:
    return close.ewm(span=period, adjust=False).mean()


def sma(close: pd.Series, period: int) -> pd.Series:
    return close.rolling(period).mean()


def z_score(close: pd.Series, period: int = 20) -> pd.Series:
    mu = close.rolling(period).mean()
    sigma = close.rolling(period).std()
    return (close - mu) / sigma


def compute_all(df: pd.DataFrame) -> pd.DataFrame:
    """Attach all standard indicators to the DataFrame in place."""
    df = df.copy()
    close = df["close"]

    df["rsi_14"] = rsi(close, 14)
    df["macd"], df["macd_signal"], df["macd_hist"] = macd(close)
    df["bb_upper"], df["bb_middle"], df["bb_lower"], df["bb_pct"] = bollinger_bands(close)
    df["atr_14"] = atr(df, 14)
    df["adx"] = adx(df, 14)
    df["ema_20"] = ema(close, 20)
    df["ema_50"] = ema(close, 50)
    df["ema_200"] = ema(close, 200)
    df["z_score_20"] = z_score(close, 20)

    try:
        df["vwap"] = vwap(df)
    except Exception:
        df["vwap"] = np.nan

    return df
