"""
Scheduler — the brain that decides what work to enqueue each day.

`daily_tick()` is the single entrypoint. It:

  1. Resumes any paused jobs (assumes daily quotas have refilled).
  2. Enqueues up to FMP_DAILY_BUDGET stale-metadata refreshes, oldest first.
  3. Enqueues up to ALPACA_DAILY_BUDGET gap-fills, biggest gap first.
  4. Returns a summary so the caller (cron/UI) can log it.

It does NOT itself sleep or recurse — that's the trigger's job. Trigger via:
  - `POST /jobs/tick` (manual button on the Tools page)
  - GitHub Actions cron hitting the same endpoint
  - Local crontab / Windows Task Scheduler if you don't use GH Actions

Budgets come from env vars so you can dial them down on free tiers without
code changes.
"""

import logging
import os

from sqlalchemy import text

from app.infrastructure.database import engine
from app.services.job_service import (
    enqueue_gap_fills,
    enqueue_metadata_updates,
    resume_all_paused,
)

log = logging.getLogger(__name__)

GAP_THRESHOLD_DAYS = 5


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


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
    """Top-N gaps by days_missing — biggest holes first."""
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


def daily_tick(
    metadata_budget: int | None = None,
    gap_budget: int | None = None,
    stale_days: int = 90,
    auto_resume: bool = True,
) -> dict:
    """Single tick. All work is rate-capped by the supplied budgets."""
    metadata_budget = metadata_budget if metadata_budget is not None \
        else _int_env("FMP_DAILY_BUDGET", 200)
    gap_budget = gap_budget if gap_budget is not None \
        else _int_env("ALPACA_DAILY_BUDGET", 1000)

    summary: dict = {
        "metadata_budget": metadata_budget,
        "gap_budget":      gap_budget,
        "resumed":         0,
        "metadata_enqueued": 0,
        "gaps_enqueued":   0,
    }

    if auto_resume:
        try:
            summary["resumed"] = resume_all_paused()
        except Exception as e:
            log.warning("resume_all_paused failed: %s", e)

    if metadata_budget > 0:
        ids = _stale_metadata_company_ids(metadata_budget, stale_days)
        if ids:
            summary["metadata_enqueued"] = enqueue_metadata_updates(ids)

    if gap_budget > 0:
        gaps = _ohlcv_gaps(gap_budget)
        if gaps:
            summary["gaps_enqueued"] = enqueue_gap_fills(gaps)

    log.info("daily_tick: %s", summary)
    return summary
