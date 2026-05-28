"""
Decides what work to enqueue each day.

daily_tick() does four things:
  1. Wake up paused jobs (a day has passed, their API quota is back).
  2. Queue some stale-metadata refreshes (capped by FMP_DAILY_BUDGET).
  3. Queue some gap-fills (capped by ALPACA_DAILY_BUDGET).
  4. Queue feature recomputes for any company whose features got left
     behind (capped by FEATURES_DAILY_BUDGET).

The tick itself doesn't loop or schedule itself — something else has to
call it. Usually that's GitHub Actions cron hitting POST /jobs/tick,
but the button on the Tools page calls the same code.
"""

import logging
import os

from sqlalchemy import text

from app.infrastructure.database import engine
from app.services.features_service import MIN_BARS as FEATURE_MIN_BARS
from app.services.job_service import (
    enqueue_feature_computes,
    enqueue_gap_fills,
    enqueue_metadata_updates,
    resume_all_paused,
)

log = logging.getLogger(__name__)

# Smaller holes are usually just weekends or market holidays — ignore them.
GAP_THRESHOLD_DAYS = 5


def _stale_metadata_company_ids(limit: int, days: int) -> list[int]:
    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT id FROM companies
            WHERE name IS NULL OR name = '' OR name = symbol
               OR metadata_updated_at IS NULL
               OR metadata_updated_at < now() - interval '{int(days)} days'
            ORDER BY metadata_updated_at NULLS FIRST, symbol
            LIMIT :limit
        """), {"limit": limit}).fetchall()
    return [r.id for r in rows]


def _ohlcv_gaps(limit: int) -> list[dict]:
    """Biggest gaps first, up to `limit`."""
    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            WITH g AS (
                SELECT
                    c.symbol, c.id AS company_id,
                    LAG(date(sd.timestamp)) OVER
                        (PARTITION BY sd.company_id ORDER BY sd.timestamp) AS prev_date,
                    date(sd.timestamp) AS curr_date
                FROM stock_data sd
                JOIN companies c ON c.id = sd.company_id
            )
            SELECT symbol, company_id,
                   prev_date::text AS gap_start,
                   curr_date::text AS gap_end,
                   (curr_date - prev_date) AS days_missing
              FROM g
             WHERE prev_date IS NOT NULL
               AND (curr_date - prev_date) > {GAP_THRESHOLD_DAYS}
             ORDER BY days_missing DESC
             LIMIT :limit
        """), {"limit": limit}).fetchall()
    return [dict(r._mapping) for r in rows]


def _stale_feature_company_ids(limit: int) -> list[int]:
    """Companies with no features, or features older than the latest bar."""
    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT c.id
            FROM companies c
            JOIN LATERAL (
                SELECT MAX(timestamp) AS last_bar, COUNT(*) AS bar_count
                  FROM stock_data WHERE company_id = c.id
            ) bars ON true
            LEFT JOIN LATERAL (
                SELECT MAX(date) AS last_feat
                  FROM stock_features WHERE company_id = c.id
            ) feats ON true
            WHERE bars.bar_count >= {int(FEATURE_MIN_BARS)}
              AND (feats.last_feat IS NULL OR date(bars.last_bar) > feats.last_feat)
            ORDER BY feats.last_feat NULLS FIRST, c.symbol
            LIMIT :limit
        """), {"limit": limit}).fetchall()
    return [r.id for r in rows]


def daily_tick(
    metadata_budget: int | None = None,
    gap_budget: int | None = None,
    features_budget: int | None = None,
    stale_days: int = 90,
    auto_resume: bool = True,
) -> dict:
    """One scheduler pass. Safe to call multiple times a day."""
    # Defaults come from env so a user on a free API tier can dial them
    # down without changing code.
    if metadata_budget is None:
        metadata_budget = int(os.getenv("FMP_DAILY_BUDGET", "200"))
    if gap_budget is None:
        gap_budget = int(os.getenv("ALPACA_DAILY_BUDGET", "1000"))
    if features_budget is None:
        features_budget = int(os.getenv("FEATURES_DAILY_BUDGET", "500"))

    summary: dict = {
        "metadata_budget":   metadata_budget,
        "gap_budget":        gap_budget,
        "features_budget":   features_budget,
        "resumed":           0,
        "metadata_enqueued": 0,
        "gaps_enqueued":     0,
        "features_enqueued": 0,
    }

    # Resume first so yesterday's paused work runs before we pile on more.
    if auto_resume:
        try:
            summary["resumed"] = resume_all_paused()
        except Exception as e:
            # Keep going even if resume hiccups.
            log.warning("resume_all_paused failed: %s", e)

    if metadata_budget > 0:
        ids = _stale_metadata_company_ids(metadata_budget, stale_days)
        if ids:
            summary["metadata_enqueued"] = enqueue_metadata_updates(ids)

    if gap_budget > 0:
        gaps = _ohlcv_gaps(gap_budget)
        if gaps:
            summary["gaps_enqueued"] = enqueue_gap_fills(gaps)

    # Features go last — gap-fills enqueued above will auto-chain their own
    # compute jobs, so this only picks up companies that the chain missed
    # (no recent fill_gap, but features are behind anyway).
    if features_budget > 0:
        ids = _stale_feature_company_ids(features_budget)
        if ids:
            summary["features_enqueued"] = enqueue_feature_computes(ids)

    log.info("daily_tick: %s", summary)
    return summary
