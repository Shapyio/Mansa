import json
from sqlalchemy import text
from app.infrastructure.database import engine
from app.infrastructure.queue import get_queue

# Map job_type string → importable function path for RQ
JOB_HANDLERS = {
    "fill_gap":         "app.jobs.fill_gap.fill_gap",
    "update_metadata":  "app.jobs.update_metadata.update_metadata",
    "compute_features": "app.jobs.compute_features.compute_features",
    "import_ohlcv":     "app.jobs.fill_gap.fill_gap",   # same handler
}


def enqueue_job(job_type: str, payload: dict, priority: int = 5) -> dict:
    """
    1. Write audit row to Postgres (status=pending)
    2. Enqueue the actual work into Redis/RQ
    3. Return both IDs so the frontend can track either way
    """
    if job_type not in JOB_HANDLERS:
        raise ValueError(f"Unknown job type: {job_type}")

    # Step 1: Postgres audit row
    with engine.begin() as conn:
        result = conn.execute(
            text("""
                INSERT INTO jobs (job_type, payload, priority, status)
                VALUES (:job_type, :payload, :priority, 'pending')
                RETURNING id
            """),
            {
                "job_type": job_type,
                "payload":  json.dumps(payload),
                "priority": priority,
            }
        )
        pg_job_id = result.fetchone()[0]

    # Step 2: RQ enqueue — pass pg_job_id so the worker can audit back
    handler_path = JOB_HANDLERS[job_type]
    module_path, fn_name = handler_path.rsplit(".", 1)
    module = __import__(module_path, fromlist=[fn_name])
    fn = getattr(module, fn_name)

    queue = get_queue(priority)
    rq_job = queue.enqueue(fn, job_id=str(pg_job_id), **{"job_id": pg_job_id, **payload})

    return {"pg_job_id": pg_job_id, "rq_job_id": rq_job.id}


def get_job_status_counts() -> dict:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT status, COUNT(*) as count FROM jobs GROUP BY status")
        ).fetchall()
    return {row.status: row.count for row in rows}


def get_recent_jobs(limit: int = 20) -> list[dict]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, job_type, status, payload, priority,
                       attempts, error_msg, created_at, finished_at
                FROM jobs
                ORDER BY created_at DESC
                LIMIT :limit
            """),
            {"limit": limit}
        ).fetchall()
    return [dict(r._mapping) for r in rows]


def retry_failed_jobs() -> int:
    """Reset Postgres audit rows AND re-enqueue into Redis."""
    with engine.begin() as conn:
        rows = conn.execute(
            text("""
                UPDATE jobs SET status='pending', attempts=0, error_msg=NULL
                WHERE status='failed'
                RETURNING id, job_type, payload, priority
            """)
        ).fetchall()

    for row in rows:
        payload = json.loads(row.payload) if isinstance(row.payload, str) else row.payload
        enqueue_job(row.job_type, payload, row.priority)

    return len(rows)


def get_queue_lengths() -> dict:
    """Get live Redis queue lengths (separate from Postgres audit counts)."""
    from app.infrastructure.queue import queues
    return {name: len(q) for name, q in queues.items()}


def enqueue_gap_fills(gaps: list[dict]) -> int:
    count = 0
    for gap in gaps:
        priority = 3 if gap.get("days_missing", 0) > 30 else 7
        enqueue_job("fill_gap", gap, priority=priority)
        count += 1
    return count


def enqueue_metadata_updates(company_ids: list[int]) -> int:
    count = 0
    for cid in company_ids:
        enqueue_job("update_metadata", {"company_id": cid}, priority=5)
        count += 1
    return count