"""
Keeps the Postgres `jobs` table in sync with what RQ workers are doing.

Wrap any job handler with @tracked and the audit row will flip from
pending → running → done (or failed, or paused) as the function runs.
Handlers stay clean — no DB writes for status, just return or raise.
"""

import functools
import traceback

from sqlalchemy import text

from app.infrastructure.database import engine


class TokenBudgetExceeded(Exception):
    """Raised when a handler hits an API rate limit.

    Tells @tracked to mark the job 'paused' instead of 'failed' — that way
    the scheduler will pick it back up tomorrow when the quota resets.
    """


def _set_running(job_id: int) -> None:
    # COALESCE keeps the original started_at if this is a retry.
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE jobs
                SET status='running',
                    started_at = COALESCE(started_at, now()),
                    attempts = attempts + 1
                WHERE id = :id
            """),
            {"id": job_id},
        )


def _set_done(job_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE jobs SET status='done', finished_at=now(), error_msg=NULL
                WHERE id = :id
            """),
            {"id": job_id},
        )


def _set_failed(job_id: int, err: str) -> None:
    # Out of retries? Mark as failed. Still have attempts? Put it back in
    # the queue and let the next worker try again.
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE jobs
                SET status = CASE WHEN attempts >= max_attempts
                                  THEN 'failed'::job_status
                                  ELSE 'pending'::job_status END,
                    finished_at = now(),
                    error_msg = :err
                WHERE id = :id
            """),
            {"id": job_id, "err": err[:2000]},   # don't bloat the table with huge tracebacks
        )


def _set_paused(job_id: int, reason: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE jobs
                SET status='paused', paused_at=now(), error_msg=:reason
                WHERE id = :id
            """),
            {"id": job_id, "reason": reason[:2000]},
        )


def tracked(fn):
    """Wrap a job handler so the Postgres `jobs` row tracks what's happening.

    `job_id` here is the Postgres row id, not the RQ id. It's passed in by
    enqueue_job.
    """

    @functools.wraps(fn)
    def wrapper(*args, job_id: int, **kwargs):
        _set_running(job_id)
        try:
            result = fn(*args, **kwargs)
            _set_done(job_id)
            return result
        except TokenBudgetExceeded as e:
            # Still re-raise — RQ needs to know the call didn't return.
            # The UI reads from Postgres though, where it'll show 'paused'.
            _set_paused(job_id, str(e) or "token budget exceeded")
            raise
        except Exception:
            _set_failed(job_id, traceback.format_exc())
            raise

    return wrapper
