"""
Crypto market data via CCXT.
Provides sync exchange access, async OHLCV fetching, and live ticker streaming.
"""
import asyncio
import logging
from typing import AsyncIterator, Dict, Any

import pandas as pd
import ccxt
import ccxt.async_support as ccxt_async

from ..config import settings

logger = logging.getLogger(__name__)

# ── Sync exchange cache (for ticker REST calls) ────────────────────────────

_sync_exchanges: Dict[str, ccxt.Exchange] = {}


def get_exchange(exchange_id: str = "binance") -> ccxt.Exchange:
    """Return (or create) a cached synchronous CCXT exchange instance."""
    if exchange_id not in _sync_exchanges:
        exchange_class = getattr(ccxt, exchange_id, None)
        if exchange_class is None:
            raise ValueError(f"Unknown exchange: {exchange_id}")
        kwargs: Dict[str, Any] = {}
        if exchange_id == "binance":
            if settings.BINANCE_API_KEY:
                kwargs["apiKey"] = settings.BINANCE_API_KEY
                kwargs["secret"] = settings.BINANCE_SECRET
        elif exchange_id == "okx":
            if settings.OKX_API_KEY:
                kwargs["apiKey"] = settings.OKX_API_KEY
                kwargs["secret"] = settings.OKX_SECRET
                kwargs["password"] = settings.OKX_PASSPHRASE
        _sync_exchanges[exchange_id] = exchange_class(kwargs)
    return _sync_exchanges[exchange_id]


# ── Async OHLCV ────────────────────────────────────────────────────────────

async def fetch_ohlcv_async(
    symbol: str,
    timeframe: str = "1h",
    limit: int = 500,
    exchange_id: str = "binance",
) -> pd.DataFrame:
    """Fetch OHLCV candles asynchronously and return a DataFrame."""
    exchange_class = getattr(ccxt_async, exchange_id, None)
    if exchange_class is None:
        raise ValueError(f"Unknown async exchange: {exchange_id}")

    kwargs: Dict[str, Any] = {}
    if exchange_id == "binance" and settings.BINANCE_API_KEY:
        kwargs["apiKey"] = settings.BINANCE_API_KEY
        kwargs["secret"] = settings.BINANCE_SECRET

    exchange = exchange_class(kwargs)
    try:
        ohlcv = await exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
    finally:
        await exchange.close()

    df = pd.DataFrame(
        ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"]
    )
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    df.set_index("timestamp", inplace=True)
    return df


# ── Live ticker stream ─────────────────────────────────────────────────────

async def stream_ticker(
    symbol: str,
    exchange_id: str = "binance",
    interval: float = 1.0,
) -> AsyncIterator[Dict[str, Any]]:
    """Async generator that yields live ticker snapshots every `interval` seconds."""
    exchange_class = getattr(ccxt_async, exchange_id, None)
    if exchange_class is None:
        raise ValueError(f"Unknown async exchange: {exchange_id}")

    exchange = exchange_class()
    try:
        while True:
            try:
                ticker = await exchange.fetch_ticker(symbol)
                yield {
                    "symbol": symbol,
                    "price": ticker.get("last"),
                    "bid": ticker.get("bid"),
                    "ask": ticker.get("ask"),
                    "volume_24h": ticker.get("baseVolume"),
                    "change_pct_24h": ticker.get("percentage", 0),
                    "high_24h": ticker.get("high"),
                    "low_24h": ticker.get("low"),
                    "timestamp": ticker.get("timestamp"),
                }
            except Exception as e:
                logger.error(f"Ticker stream error for {symbol}: {e}")
                yield {"error": str(e), "symbol": symbol}
            await asyncio.sleep(interval)
    finally:
        await exchange.close()
