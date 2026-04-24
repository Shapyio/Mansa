from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from typing import Optional

from app.infrastructure.database import engine
from app.services.job_service import (
    get_job_status_counts,
    get_recent_jobs,
    retry_failed_jobs,
    enqueue_gap_fills,
    enqueue_metadata_updates,
    enqueue_job,
    get_queue_lengths,
)

router = APIRouter()

GAP_THRESHOLD_DAYS = 5


def _find_ohlcv_gaps() -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                c.symbol,
                c.id AS company_id,
                LAG(date(sd.timestamp)) OVER (
                    PARTITION BY sd.company_id ORDER BY sd.timestamp
                ) AS prev_date,
                date(sd.timestamp) AS curr_date
            FROM stock_data sd
            JOIN companies c ON c.id = sd.company_id
        """)).fetchall()

    gaps = []
    for row in rows:
        if row.prev_date is None:
            continue
        delta = (row.curr_date - row.prev_date).days
        if delta > GAP_THRESHOLD_DAYS:
            gaps.append({
                "symbol":       row.symbol,
                "company_id":   row.company_id,
                "gap_start":    str(row.prev_date),
                "gap_end":      str(row.curr_date),
                "days_missing": delta,
            })

    return sorted(gaps, key=lambda g: g["days_missing"], reverse=True)


def _find_missing_metadata() -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT id, symbol, metadata_updated_at
            FROM companies
            WHERE name IS NULL
               OR name = ''
               OR metadata_updated_at IS NULL
               OR metadata_updated_at < now() - interval '90 days'
            ORDER BY symbol
        """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/status")
def job_status():
    """Postgres audit counts + recent jobs + live Redis queue lengths."""
    return {
        "counts":        get_job_status_counts(),
        "recent":        get_recent_jobs(limit=20),
        "redis_queues":  get_queue_lengths(),   # live Redis view
    }


@router.get("/gaps")
def check_gaps():
    gaps = _find_ohlcv_gaps()
    return {"count": len(gaps), "gaps": gaps}


class EnqueueGapsRequest(BaseModel):
    gaps: list[dict]


@router.post("/gaps/enqueue")
def enqueue_gaps(body: EnqueueGapsRequest):
    count = enqueue_gap_fills(body.gaps)
    return {"enqueued": count}


@router.get("/metadata/stale")
def check_stale_metadata():
    stale = _find_missing_metadata()
    return {"count": len(stale), "companies": stale}


class EnqueueMetadataRequest(BaseModel):
    company_ids: list[int]


@router.post("/metadata/enqueue")
def enqueue_metadata(body: EnqueueMetadataRequest):
    count = enqueue_metadata_updates(body.company_ids)
    return {"enqueued": count}


@router.post("/retry-failed")
def retry_failed():
    count = retry_failed_jobs()
    return {"retried": count}


class SubmitJobRequest(BaseModel):
    job_type: str
    payload: dict = {}
    priority: Optional[int] = 5


@router.post("/submit")
def submit_job(body: SubmitJobRequest):
    allowed = {"import_ohlcv", "fill_gap", "update_metadata", "compute_features"}
    if body.job_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unknown job type: {body.job_type}")
    result = enqueue_job(body.job_type, body.payload, body.priority)
    return result