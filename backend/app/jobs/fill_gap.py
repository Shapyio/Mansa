"""Fetch OHLCV bars for [start, end] and upsert into stock_data.

When the upsert actually changes data, chain a `compute_features` job for
the same company so derived indicators stay in sync. Skipping the chain
when nothing changed keeps the queue tidy on no-op refreshes.
"""

import logging
import os

from app.jobs._audit import tracked
from app.services.job_service import enqueue_compute_features_if_not_pending
from app.services.ohlcv_service import fetch_and_upsert

log = logging.getLogger(__name__)

# Set AUTO_COMPUTE_FEATURES=false in the env to disable the chain.
_AUTO_CHAIN = os.getenv("AUTO_COMPUTE_FEATURES", "true").lower() not in ("0", "false", "no")


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

    result = fetch_and_upsert(sym, s, e, feed=feed)

    cid = result.get("company_id")
    if _AUTO_CHAIN and cid is not None and result.get("rows_upserted", 0) > 0:
        chained = enqueue_compute_features_if_not_pending(cid)
        if chained is not None:
            result["chained_compute_features_job"] = chained
            log.info("Chained compute_features job #%s for %s", chained, sym)

    return result
