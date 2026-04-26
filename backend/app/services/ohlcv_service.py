"""
OHLCV ingestion service — refactored from scripts/get_data.py.

Exposes `fetch_and_upsert(symbol, start, end, feed)` so it can be called from:
  - RQ handlers (app/jobs/fill_gap.py)
  - CLI scripts
  - cron jobs / GitHub Actions

Behavior:
  - Lazy Alpaca client (no work at import).
  - Retry + 429 -> TokenBudgetExceeded via call_with_retry.
  - Single batched executemany() upsert (was per-row, very slow on backfills).
  - Auto-creates the company row if missing.
  - Returns {"rows_upserted": N, "symbol": ..., "start": ..., "end": ...}.
"""

import datetime as dt
import logging
from typing import Union

from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
from sqlalchemy import text

from app.infrastructure.alpaca import call_with_retry, get_client
from app.infrastructure.database import engine

log = logging.getLogger(__name__)

DateLike = Union[str, dt.date, dt.datetime]


def _coerce_dt(d: DateLike) -> dt.datetime:
    if isinstance(d, dt.datetime):
        return d
    if isinstance(d, dt.date):
        return dt.datetime(d.year, d.month, d.day)
    return dt.datetime.fromisoformat(str(d))


def _ensure_company(symbol: str) -> int:
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT id FROM companies WHERE symbol = :s"),
            {"s": symbol},
        ).fetchone()
        if row:
            return row[0]
        conn.execute(
            text("""
                INSERT INTO companies (symbol, name) VALUES (:s, :n)
                ON CONFLICT (symbol) DO NOTHING
            """),
            {"s": symbol, "n": symbol},
        )
        return conn.execute(
            text("SELECT id FROM companies WHERE symbol = :s"),
            {"s": symbol},
        ).fetchone()[0]


_UPSERT_SQL = text("""
    INSERT INTO stock_data
        (company_id, timestamp, open, high, low, close, volume, trade_count, vwap)
    VALUES
        (:company_id, :timestamp, :open, :high, :low, :close, :volume, :trade_count, :vwap)
    ON CONFLICT (company_id, timestamp) DO UPDATE SET
        open        = EXCLUDED.open,
        high        = EXCLUDED.high,
        low         = EXCLUDED.low,
        close       = EXCLUDED.close,
        volume      = EXCLUDED.volume,
        trade_count = EXCLUDED.trade_count,
        vwap        = EXCLUDED.vwap
""")


def fetch_and_upsert(
    symbol: str,
    start: DateLike,
    end: DateLike,
    feed: str = "iex",
    timeframe: TimeFrame = TimeFrame.Day,
) -> dict:
    symbol = symbol.upper().strip()
    start_dt = _coerce_dt(start)
    end_dt   = _coerce_dt(end)
    if start_dt >= end_dt:
        raise ValueError(f"start ({start_dt}) must be before end ({end_dt})")

    log.info("Fetching %s bars %s -> %s (feed=%s)", symbol, start_dt.date(), end_dt.date(), feed)

    req = StockBarsRequest(
        symbol_or_symbols=symbol,
        timeframe=timeframe,
        start=start_dt,
        end=end_dt,
        feed=feed,
    )
    bars = call_with_retry(lambda: get_client().get_stock_bars(req))

    df = bars.df
    if df is None or df.empty:
        log.info("No bars returned for %s in window", symbol)
        return {"symbol": symbol, "rows_upserted": 0,
                "start": str(start_dt), "end": str(end_dt)}

    df = df.reset_index()
    company_id = _ensure_company(symbol)

    rows = [
        {
            "company_id":  company_id,
            "timestamp":   r["timestamp"],
            "open":        r.get("open"),
            "high":        r.get("high"),
            "low":         r.get("low"),
            "close":       r.get("close"),
            "volume":      int(r["volume"]) if r.get("volume") is not None else None,
            "trade_count": int(r["trade_count"]) if r.get("trade_count") is not None else None,
            "vwap":        r.get("vwap"),
        }
        for _, r in df.iterrows()
    ]

    with engine.begin() as conn:
        conn.execute(_UPSERT_SQL, rows)  # one round-trip, executemany under the hood

    log.info("Upserted %d rows for %s", len(rows), symbol)
    return {
        "symbol": symbol, "rows_upserted": len(rows),
        "start": str(start_dt), "end": str(end_dt),
    }
