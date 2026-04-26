import json
from typing import Optional

from sqlalchemy import text

from app.infrastructure.database import engine
from app.infrastructure.queue import get_queue, queues, redis_conn


# job_type -> (importable handler path, default tags)
JOB_HANDLERS: dict[str, tuple[str, list[str]]] = {
    "fill_gap":         ("app.jobs.fill_gap.fill_gap",                 ["ETL", "DB"]),
    "import_ohlcv":     ("app.jobs.fill_gap.fill_gap",                 ["ETL", "DB"]),
    "update_metadata":  ("app.jobs.update_metadata.update_metadata",   ["ETL", "DB"]),
    "compute_features": ("app.jobs.compute_features.compute_features", ["Features", "DB"]),
    "train_model":      ("app.jobs.train_model.train_model",           ["Model"]),
}


def _import_handler(path: str):
    module_path, fn_name = path.rsplit(".", 1)
    module = __import__(module_path, fromlist=[fn_name])
    return getattr(module, fn_name)


def enqueue_job(
    job_type: str,
    payload: dict,
    priority: int = 5,
    tags: Optional[list[str]] = None,
) -> dict:
    """
    1. Insert audit row in Postgres (status=pending) with tags + payload.
    2. Push the work onto the matching RQ queue.
    Returns {pg_job_id, rq_job_id}.
    """
    if job_type not in JOB_HANDLERS:
        raise ValueError(f"Unknown job type: {job_type}")

    handler_path, default_tags = JOB_HANDLERS[job_type]
    merged_tags = sorted(set((tags or []) + default_tags))

    with engine.begin() as conn:
        row = conn.execute(
            text("""
                INSERT INTO jobs (job_type, payload, priority, status, tags)
                VALUES (:job_type, :payload, :priority, 'pending', :tags)
                RETURNING id
            """),
            {
                "job_type": job_type,
                "payload":  json.dumps(payload),
                "priority": priority,
                "tags":     merged_tags,
            },
        ).fetchone()
        pg_job_id = row[0]

    fn = _import_handler(handler_path)
    queue = get_queue(priority)
    # `job_id` is also a kwarg on Queue.enqueue itself (the RQ job id), so
    # pass handler args via kwargs= to avoid collision.
    try:
        rq_job = queue.enqueue(fn, kwargs={"job_id": pg_job_id, **payload})
    except Exception:
        # Don't leave an orphaned pending row with no Redis-side job.
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM jobs WHERE id=:id"), {"id": pg_job_id})
        raise

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE jobs SET rq_job_id=:rid WHERE id=:id"),
            {"rid": rq_job.id, "id": pg_job_id},
        )

    return {"pg_job_id": pg_job_id, "rq_job_id": rq_job.id}


def get_job_status_counts() -> dict:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT status, COUNT(*) AS count FROM jobs GROUP BY status")
        ).fetchall()
    return {row.status: row.count for row in rows}


def get_recent_jobs(
    limit: int = 50,
    tags: Optional[list[str]] = None,
    status: Optional[str] = None,
) -> list[dict]:
    """
    List jobs with full timestamps. `tags` filters jobs that contain ALL given tags.
    `status` is an exact match (pending/running/done/failed/paused).
    """
    where = []
    params: dict = {"limit": limit}
    if tags:
        where.append("tags @> :tags")
        params["tags"] = tags
    if status:
        where.append("status = :status")
        params["status"] = status
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    sql = f"""
        SELECT id, job_type, status, payload, priority, tags,
               attempts, max_attempts, error_msg, rq_job_id,
               created_at, started_at, finished_at, paused_at
        FROM jobs
        {where_sql}
        ORDER BY created_at DESC
        LIMIT :limit
    """
    with engine.connect() as conn:
        rows = conn.execute(text(sql), params).fetchall()
    return [dict(r._mapping) for r in rows]


def list_all_tags() -> list[str]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT DISTINCT unnest(tags) AS tag FROM jobs ORDER BY tag")
        ).fetchall()
    return [r.tag for r in rows]


def retry_failed_jobs() -> int:
    """Reset failed audit rows AND re-enqueue them."""
    with engine.begin() as conn:
        rows = conn.execute(
            text("""
                UPDATE jobs
                SET status='pending', attempts=0, error_msg=NULL,
                    started_at=NULL, finished_at=NULL, paused_at=NULL
                WHERE status='failed'
                RETURNING id, job_type, payload, priority, tags
            """)
        ).fetchall()

    for row in rows:
        payload = json.loads(row.payload) if isinstance(row.payload, str) else row.payload
        enqueue_job(row.job_type, payload, row.priority, tags=list(row.tags or []))
    return len(rows)


def pause_job(pg_job_id: int, reason: str = "manual") -> bool:
    """
    Cancel the RQ-side enqueue (if still queued) and mark Postgres row 'paused'.
    Running jobs continue until they finish or self-pause via TokenBudgetExceeded.
    """
    from rq.job import Job
    from rq.exceptions import NoSuchJobError

    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT rq_job_id FROM jobs WHERE id=:id"),
            {"id": pg_job_id},
        ).fetchone()
        if not row:
            return False

        if row.rq_job_id:
            try:
                Job.fetch(row.rq_job_id, connection=redis_conn).cancel()
            except NoSuchJobError:
                pass

        conn.execute(
            text("""
                UPDATE jobs
                SET status='paused', paused_at=now(), error_msg=:reason
                WHERE id=:id
            """),
            {"id": pg_job_id, "reason": reason},
        )
    return True


def resume_job(pg_job_id: int) -> Optional[dict]:
    """Re-enqueue a paused job. Returns new ids or None if not paused."""
    with engine.begin() as conn:
        row = conn.execute(
            text("""
                SELECT job_type, payload, priority, tags, status
                FROM jobs WHERE id=:id
            """),
            {"id": pg_job_id},
        ).fetchone()
        if not row or row.status != "paused":
            return None

        conn.execute(
            text("""
                UPDATE jobs
                SET status='pending', paused_at=NULL, error_msg=NULL
                WHERE id=:id
            """),
            {"id": pg_job_id},
        )

    payload = json.loads(row.payload) if isinstance(row.payload, str) else row.payload
    handler_path, _ = JOB_HANDLERS[row.job_type]
    fn = _import_handler(handler_path)
    rq_job = get_queue(row.priority).enqueue(
        fn, kwargs={"job_id": pg_job_id, **payload}
    )

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE jobs SET rq_job_id=:rid WHERE id=:id"),
            {"rid": rq_job.id, "id": pg_job_id},
        )
    return {"pg_job_id": pg_job_id, "rq_job_id": rq_job.id}


def pause_all_pending(reason: str = "global pause") -> int:
    """Bulk pause: cancel all queued RQ jobs and flip pending rows to paused."""
    from rq.job import Job
    from rq.exceptions import NoSuchJobError

    with engine.begin() as conn:
        rows = conn.execute(
            text("""
                UPDATE jobs SET status='paused', paused_at=now(), error_msg=:reason
                WHERE status='pending'
                RETURNING rq_job_id
            """),
            {"reason": reason},
        ).fetchall()

    for r in rows:
        if r.rq_job_id:
            try:
                Job.fetch(r.rq_job_id, connection=redis_conn).cancel()
            except NoSuchJobError:
                pass
    return len(rows)


def resume_all_paused() -> int:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id FROM jobs WHERE status='paused'")
        ).fetchall()
    count = 0
    for r in rows:
        if resume_job(r.id):
            count += 1
    return count


def get_queue_lengths() -> dict:
    return {name: len(q) for name, q in queues.items()}


def enqueue_gap_fills(gaps: list[dict]) -> int:
    for gap in gaps:
        priority = 3 if gap.get("days_missing", 0) > 30 else 7
        enqueue_job("fill_gap", gap, priority=priority)
    return len(gaps)


def enqueue_metadata_updates(company_ids: list[int]) -> int:
    for cid in company_ids:
        enqueue_job("update_metadata", {"company_id": cid}, priority=5)
    return len(company_ids)
