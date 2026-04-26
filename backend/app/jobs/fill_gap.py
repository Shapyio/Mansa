"""Fetch OHLCV bars for [start, end] and upsert into stock_data."""

from app.jobs._audit import tracked


@tracked
def fill_gap(symbol: str = None, start: str = None, end: str = None,
             company_id: int = None, gap_start: str = None, gap_end: str = None,
             **_ignored):
    # Accept both naming conventions: {symbol,start,end} and gap-style {symbol,gap_start,gap_end}
    sym = symbol
    s = start or gap_start
    e = end or gap_end
    if not sym or not s or not e:
        raise ValueError(f"fill_gap missing args: symbol={sym} start={s} end={e}")

    # TODO: wire to backend/core/ingestion once implemented
    # from core.ingestion.alpaca import fetch_and_upsert
    # fetch_and_upsert(sym, s, e)
    return {"symbol": sym, "start": s, "end": e, "rows_upserted": 0, "stub": True}
