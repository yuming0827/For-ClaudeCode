"""
Taiwan stock market data via the TWSE open API.
"""
import logging
from datetime import datetime, timedelta

import pandas as pd
import requests

logger = logging.getLogger(__name__)

_TWSE_URL = "https://www.twse.com.tw/exchangeReport/STOCK_DAY"


def fetch_daily_ohlcv(symbol: str, days: int = 365) -> pd.DataFrame:
    """
    Fetch daily OHLCV data for a TWSE-listed stock.

    Args:
        symbol: Stock code (e.g. "2330" for TSMC).
        days:   Number of calendar days of history to fetch.

    Returns:
        DataFrame with columns [open, high, low, close, volume] and a DatetimeIndex.
    """
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    records = []
    current = start_date.replace(day=1)

    while current <= end_date:
        date_str = current.strftime("%Y%m%d")
        try:
            resp = requests.get(
                _TWSE_URL,
                params={"response": "json", "date": date_str, "stockNo": symbol},
                timeout=10,
            )
            resp.raise_for_status()
            payload = resp.json()

            if payload.get("stat") == "OK" and payload.get("data"):
                for row in payload["data"]:
                    try:
                        # Row[0]: date in ROC format "YYY/MM/DD"
                        parts = row[0].split("/")
                        year = int(parts[0]) + 1911
                        month = int(parts[1])
                        day = int(parts[2])
                        ts = datetime(year, month, day)

                        def _parse(val: str) -> float:
                            return float(val.replace(",", ""))

                        records.append(
                            {
                                "timestamp": ts,
                                "open": _parse(row[3]),
                                "high": _parse(row[4]),
                                "low": _parse(row[5]),
                                "close": _parse(row[6]),
                                "volume": int(row[1].replace(",", "")),
                            }
                        )
                    except (ValueError, IndexError) as exc:
                        logger.debug(f"Skipping TWSE row {row}: {exc}")
        except Exception as exc:
            logger.warning(f"TWSE API error for {symbol} {date_str}: {exc}")

        # Advance to next month
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1, day=1)
        else:
            current = current.replace(month=current.month + 1, day=1)

    if not records:
        raise ValueError(f"No data returned for TW stock {symbol}")

    df = pd.DataFrame(records)
    df.set_index("timestamp", inplace=True)
    df.sort_index(inplace=True)
    return df
