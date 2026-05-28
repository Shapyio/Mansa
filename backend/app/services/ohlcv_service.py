"""
Fetches daily bars from Alpaca and saves them to `stock_data`.

Called from the fill_gap job, the CLI script, or anywhere else that
needs to pull price history. A 429 from Alpaca turns into a paused job
that the scheduler retries tomorrow.
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

    # iex = free, partial coverage. sip = paid, full coverage. Same call.

    req = StockBarsRequest(
        symbol_or_symbols=symbol,
        timeframe=timeframe,
        start=start_dt,
        end=end_dt,
        feed=feed,
    )
    bars = call_with_retry(lambda: get_client().get_stock_bars(req))

    company_id = _ensure_company(symbol)

    df = bars.df
    if df is None or df.empty:
        log.info("No bars returned for %s in window", symbol)
        return {"symbol": symbol, "company_id": company_id, "rows_upserted": 0,
                "start": str(start_dt), "end": str(end_dt)}

    df = df.reset_index()

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

    # One batched insert — way faster than the per-row loop we had before.
    with engine.begin() as conn:
        conn.execute(_UPSERT_SQL, rows)

    log.info("Upserted %d rows for %s", len(rows), symbol)
    return {
        "symbol": symbol, "company_id": company_id, "rows_upserted": len(rows),
        "start": str(start_dt), "end": str(end_dt),
    }
