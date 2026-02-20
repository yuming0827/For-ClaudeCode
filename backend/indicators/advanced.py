"""
Advanced / institutional-grade indicators.
"""
import numpy as np
import pandas as pd
from typing import Optional


def volatility_squeeze(
    df: pd.DataFrame,
    bb_period: int = 20,
    bb_std: float = 2.0,
    kc_period: int = 20,
    kc_atr_mult: float = 1.5,
) -> pd.Series:
    """
    Lazybear / TTM Squeeze: True when Bollinger Bands are inside Keltner Channels.
    Returns boolean Series — True means squeeze (low volatility, potential breakout).
    """
    close = df["close"]
    mid_bb = close.rolling(bb_period).mean()
    std = close.rolling(bb_period).std()
    bb_upper = mid_bb + bb_std * std
    bb_lower = mid_bb - bb_std * std

    tr = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - df["close"].shift(1)).abs(),
            (df["low"] - df["close"].shift(1)).abs(),
        ],
        axis=1,
    ).max(axis=1)
    atr = tr.rolling(kc_period).mean()
    mid_kc = close.ewm(span=kc_period, adjust=False).mean()
    kc_upper = mid_kc + kc_atr_mult * atr
    kc_lower = mid_kc - kc_atr_mult * atr

    return (bb_upper < kc_upper) & (bb_lower > kc_lower)


def order_flow_imbalance(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """
    Approximates buy/sell imbalance using close position within the bar.
    Value in [-1, +1]. Positive = buyer dominance.
    """
    ratio = (df["close"] - df["low"]) / (df["high"] - df["low"] + 1e-10) - 0.5
    return ratio.rolling(period).mean() * 2


def price_volume_divergence(
    df: pd.DataFrame, period: int = 14
) -> pd.Series:
    """
    Detects divergence between price momentum and volume momentum.
    Positive value = bullish divergence; Negative = bearish divergence.
    """
    price_mom = df["close"].pct_change(period)
    vol_mom = df["volume"].pct_change(period)
    return price_mom - vol_mom


def hurst_exponent(close: pd.Series, max_lag: int = 100) -> float:
    """
    Hurst exponent via R/S analysis.
    H < 0.5 → mean reverting; H ≈ 0.5 → random walk; H > 0.5 → trending.
    """
    lags = range(2, min(max_lag, len(close) // 2))
    tau = []
    for lag in lags:
        sub = close.values[-lag * 10 :]
        if len(sub) < lag:
            continue
        segments = [sub[i : i + lag] for i in range(0, len(sub) - lag, lag)]
        rs_list = []
        for seg in segments:
            mean = np.mean(seg)
            dev = np.cumsum(seg - mean)
            r = dev.max() - dev.min()
            s = np.std(seg, ddof=1)
            if s > 0:
                rs_list.append(r / s)
        if rs_list:
            tau.append((lag, np.mean(rs_list)))
    if len(tau) < 2:
        return 0.5
    lags_arr = np.log([t[0] for t in tau])
    rs_arr = np.log([t[1] for t in tau])
    return float(np.polyfit(lags_arr, rs_arr, 1)[0])


def statistical_arbitrage_zscore(
    series_a: pd.Series,
    series_b: pd.Series,
    lookback: int = 60,
) -> tuple[pd.Series, pd.Series]:
    """
    Compute the rolling OLS spread and its z-score for a pairs trade.
    Returns (spread, z_score).
    """
    # rolling OLS hedge ratio
    hedge_ratio = (
        series_a.rolling(lookback)
        .cov(series_b)
        .div(series_b.rolling(lookback).var())
    )
    spread = series_a - hedge_ratio * series_b
    z_score = (spread - spread.rolling(lookback).mean()) / (
        spread.rolling(lookback).std() + 1e-10
    )
    return spread, z_score


def institutional_chip_analysis(df: pd.DataFrame) -> pd.Series:
    """
    Simple institutional-activity proxy: large-volume bars relative to average.
    Returns a normalised score in [0, 1].
    """
    avg_vol = df["volume"].rolling(20).mean()
    score = (df["volume"] / (avg_vol + 1e-10)).clip(upper=5) / 5
    return score
