import json, time, traceback
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "db"),
    "database": os.getenv("POSTGRES_DB", "stockdb"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "password"),
}

def claim_job(cursor):
    """Atomically claim the next pending job."""
    cursor.execute("""
        UPDATE jobs SET status = 'running', started_at = now(), attempts = attempts + 1
        WHERE id = (
            SELECT id FROM jobs
            WHERE status = 'pending' AND attempts < max_attempts
            ORDER BY priority, created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *;
    """)
    return cursor.fetchone()

def complete_job(cursor, job_id):
    cursor.execute(
        "UPDATE jobs SET status='done', finished_at=now() WHERE id=%s", (job_id,)
    )

def fail_job(cursor, job_id, error):
    cursor.execute("""
        UPDATE jobs SET
            status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'pending' END,
            error_msg = %s,
            finished_at = now()
        WHERE id = %s
    """, (error[:1000], job_id))

def handle_job(job):
    payload = job["payload"]
    jtype = job["job_type"]

    if jtype == "fill_gap":
        from get_data import fetch_and_upsert  # refactor get_data.py into a callable fn
        fetch_and_upsert(payload["symbol"], payload["start"], payload["end"])

    elif jtype == "update_metadata":
        from get_company_data import get_company_data, upsert_company
        # handled inline or via import

    elif jtype == "compute_features":
        from compute_features import compute_for_company
        compute_for_company(payload["company_id"], payload["symbol"])

def run_worker(poll_interval=10):
    conn = psycopg2.connect(**DB_CONFIG)
    print("Worker started")

    while True:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            job = claim_job(cur)
            conn.commit()

            if job:
                print(f"Running job {job['id']} ({job['job_type']})")
                try:
                    handle_job(job)
                    complete_job(cur, job["id"])
                except Exception as e:
                    fail_job(cur, job["id"], traceback.format_exc())
                conn.commit()
            else:
                time.sleep(poll_interval)

if __name__ == "__main__":
    run_worker()