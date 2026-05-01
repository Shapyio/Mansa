import json
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = (
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
    f"@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
)
engine = create_engine(DATABASE_URL)

GAP_THRESHOLD_DAYS = 5  # ignore weekends/holidays, flag if > 5 calendar days missing

def find_ohlcv_gaps():
    """Find stocks with gaps > threshold days in stock_data."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                c.symbol,
                c.id as company_id,
                LAG(date(sd.timestamp)) OVER (PARTITION BY sd.company_id ORDER BY sd.timestamp) AS prev_date,
                date(sd.timestamp) AS curr_date
            FROM stock_data sd
            JOIN companies c ON c.id = sd.company_id
        """)).fetchall()

    gaps = []
    for row in rows:
        if row.prev_date and (row.curr_date - row.prev_date).days > GAP_THRESHOLD_DAYS:
            gaps.append({
                "symbol":     row.symbol,
                "company_id": row.company_id,
                "gap_start":  str(row.prev_date),
                "gap_end":    str(row.curr_date),
                "days_missing": (row.curr_date - row.prev_date).days
            })
    return gaps

def find_missing_company_metadata():
    """Find companies with no name or stale metadata (not updated in 90 days)."""
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT symbol, id, metadata_updated_at
            FROM companies
            WHERE name IS NULL
               OR name = ''
               OR metadata_updated_at IS NULL
               OR metadata_updated_at < now() - interval '90 days'
        """)).fetchall()
    return [dict(r._mapping) for r in rows]

def enqueue_gap_fills(gaps):
    """Insert fill_gap jobs into the queue."""
    with engine.begin() as conn:
        for gap in gaps:
            conn.execute(text("""
                INSERT INTO jobs (job_type, payload, priority)
                VALUES ('fill_gap', :payload, :priority)
            """), {
                "payload":  json.dumps(gap),
                "priority": 3 if gap["days_missing"] > 30 else 7  # bigger gaps = higher priority
            })
    print(f"Enqueued {len(gaps)} gap-fill jobs")

if __name__ == "__main__":
    gaps = find_ohlcv_gaps()
    print(f"Found {len(gaps)} gaps")
    for g in gaps[:10]:
        print(f"  {g['symbol']}: {g['gap_start']} → {g['gap_end']} ({g['days_missing']}d)")
    enqueue_gap_fills(gaps)