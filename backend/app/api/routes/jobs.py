from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text

from app.infrastructure.database import engine
from app.services.job_service import (
    JOB_HANDLERS,
    enqueue_gap_fills,
    enqueue_job,
    enqueue_metadata_updates,
    get_job_status_counts,
    get_queue_lengths,
    get_recent_jobs,
    list_all_tags,
    pause_all_pending,
    pause_job,
    resume_all_paused,
    resume_job,
    retry_failed_jobs,
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
            WHERE name IS NULL OR name = ''
               OR metadata_updated_at IS NULL
               OR metadata_updated_at < now() - interval '90 days'
            ORDER BY symbol
        """)).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/status")
def job_status(
    limit: int = 50,
    tag: list[str] = Query(default_factory=list),
    status: Optional[str] = None,
):
    """Postgres counts + recent jobs (filterable) + live Redis queue lengths."""
    return {
        "counts":       get_job_status_counts(),
        "recent":       get_recent_jobs(limit=limit, tags=tag or None, status=status),
        "redis_queues": get_queue_lengths(),
        "tags":         list_all_tags(),
        "job_types":    list(JOB_HANDLERS.keys()),
    }


@router.get("/tags")
def list_tags():
    return {"tags": list_all_tags()}


@router.get("/gaps")
def check_gaps():
    gaps = _find_ohlcv_gaps()
    return {"count": len(gaps), "gaps": gaps}


class EnqueueGapsRequest(BaseModel):
    gaps: list[dict]


@router.post("/gaps/enqueue")
def enqueue_gaps(body: EnqueueGapsRequest):
    return {"enqueued": enqueue_gap_fills(body.gaps)}


@router.get("/metadata/stale")
def check_stale_metadata():
    stale = _find_missing_metadata()
    return {"count": len(stale), "companies": stale}


class EnqueueMetadataRequest(BaseModel):
    company_ids: list[int]


@router.post("/metadata/enqueue")
def enqueue_metadata(body: EnqueueMetadataRequest):
    return {"enqueued": enqueue_metadata_updates(body.company_ids)}


@router.post("/retry-failed")
def retry_failed():
    return {"retried": retry_failed_jobs()}


class SubmitJobRequest(BaseModel):
    job_type: str
    payload: dict = {}
    priority: Optional[int] = 5
    tags: Optional[list[str]] = None


@router.post("/submit")
def submit_job(body: SubmitJobRequest):
    if body.job_type not in JOB_HANDLERS:
        raise HTTPException(400, f"Unknown job type: {body.job_type}")
    return enqueue_job(body.job_type, body.payload, body.priority, tags=body.tags)


@router.post("/{job_id}/pause")
def pause_one(job_id: int):
    if not pause_job(job_id):
        raise HTTPException(404, f"Job {job_id} not found")
    return {"paused": job_id}


@router.post("/{job_id}/resume")
def resume_one(job_id: int):
    result = resume_job(job_id)
    if result is None:
        raise HTTPException(409, f"Job {job_id} is not paused")
    return result


class PauseAllRequest(BaseModel):
    reason: Optional[str] = "global pause"


@router.post("/pause-all")
def pause_all(body: PauseAllRequest = PauseAllRequest()):
    return {"paused": pause_all_pending(body.reason or "global pause")}


@router.post("/resume-all")
def resume_all():
    return {"resumed": resume_all_paused()}
