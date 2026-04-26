"""Fetch OHLCV bars for [start, end] and upsert into stock_data."""

from app.jobs._audit import tracked
from app.services.ohlcv_service import fetch_and_upsert


@tracked
def fill_gap(symbol: str = None, start: str = None, end: str = None,
             company_id: int = None, gap_start: str = None, gap_end: str = None,
             feed: str = "iex", **_ignored):
    # Accept both naming conventions: {symbol,start,end} and gap-style {symbol,gap_start,gap_end}
    sym = symbol
    s = start or gap_start
    e = end or gap_end
    if not sym or not s or not e:
        raise ValueError(f"fill_gap missing args: symbol={sym} start={s} end={e}")

    return fetch_and_upsert(sym, s, e, feed=feed)
