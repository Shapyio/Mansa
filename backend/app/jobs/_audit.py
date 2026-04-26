"""
Audit + control wrapper for RQ handlers.

Each handler is a plain function. The @tracked decorator wraps it so that:
  - Postgres `jobs` row transitions pending -> running -> done/failed/paused
  - started_at / finished_at / paused_at timestamps are written
  - TokenBudgetExceeded -> status='paused' (not failed); job can be resumed later
  - Any other exception -> status='failed', error_msg captured
"""

import functools
import traceback
from sqlalchemy import text

from app.infrastructure.database import engine


class TokenBudgetExceeded(Exception):
    """Raised by a handler when an upstream API rate/token budget is gone.

    The wrapper treats this differently from a failure: the job is parked
    in 'paused' state and can be resumed once the budget refills.
    """


def _set_running(job_id: int) -> None:
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
            {"id": job_id, "err": err[:2000]},
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
    """Wrap an RQ handler so its lifecycle is mirrored into Postgres."""

    @functools.wraps(fn)
    def wrapper(*args, job_id: int, **kwargs):
        _set_running(job_id)
        try:
            result = fn(*args, **kwargs)
            _set_done(job_id)
            return result
        except TokenBudgetExceeded as e:
            _set_paused(job_id, str(e) or "token budget exceeded")
            raise
        except Exception:
            _set_failed(job_id, traceback.format_exc())
            raise

    return wrapper
