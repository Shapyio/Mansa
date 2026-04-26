"""
Schema migration script — safe to run at any time.
Creates missing tables, types, indexes, and hypertables.
Skips anything that already exists.

Usage:
    python scripts/migrate.py
    DATABASE_URL=postgresql://... python scripts/migrate.py
"""

import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@db:5432/stockdb",
)


# ---------------------------------------------------------------------------
# Each migration is a (label, sql) pair.
# All statements use IF NOT EXISTS or DO-block guards — re-runnable safely.
# ---------------------------------------------------------------------------

MIGRATIONS = [

    ("extension: timescaledb", """
        CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
    """),

    ("enum: job_status", """
        DO $$ BEGIN
            CREATE TYPE job_status AS ENUM ('pending', 'running', 'done', 'failed', 'paused');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """),

    ("enum: job_status add paused (idempotent)", """
        DO $$ BEGIN
            ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'paused';
        EXCEPTION WHEN others THEN NULL;
        END $$;
    """),

    ("enum: job_type", """
        DO $$ BEGIN
            CREATE TYPE job_type AS ENUM (
                'import_ohlcv', 'fill_gap', 'update_metadata', 'compute_features'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """),

    ("table: sectors", """
        CREATE TABLE IF NOT EXISTS sectors (
            id   SERIAL PRIMARY KEY,
            name VARCHAR(25) UNIQUE NOT NULL
        );
    """),

    ("table: industries", """
        CREATE TABLE IF NOT EXISTS industries (
            id   SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL
        );
    """),

    ("table: companies", """
        CREATE TABLE IF NOT EXISTS companies (
            id          SERIAL PRIMARY KEY,
            symbol      VARCHAR(10) UNIQUE NOT NULL,
            name        VARCHAR(100),
            sector_id   INT REFERENCES sectors(id),
            industry_id INT REFERENCES industries(id),
            country     VARCHAR(50),
            state       VARCHAR(25),
            city        VARCHAR(25)
        );
    """),

    ("table: stock_data", """
        CREATE TABLE IF NOT EXISTS stock_data (
            company_id INT          NOT NULL REFERENCES companies(id),
            timestamp  TIMESTAMPTZ  NOT NULL,
            open       NUMERIC,
            high       NUMERIC,
            low        NUMERIC,
            close      NUMERIC,
            volume     BIGINT,
            PRIMARY KEY (company_id, timestamp)
        );
    """),

    ("hypertable: stock_data", """
        DO $$
        BEGIN
            PERFORM create_hypertable(
                'stock_data', 'timestamp',
                'company_id',
                number_partitions => 4,
                if_not_exists     => TRUE
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Hypertable skipped: %', SQLERRM;
        END $$;
    """),

    ("table: company_metadata", """
        CREATE TABLE IF NOT EXISTS company_metadata (
            company_id          INTEGER NOT NULL REFERENCES companies(id),
            metadata_updated_at DATE    NOT NULL,
            market_cap          BIGINT,
            pe_ratio            NUMERIC,
            dividend_yield      NUMERIC,
            employees           INTEGER,
            PRIMARY KEY (company_id, metadata_updated_at)
        );
    """),

    ("table: stock_features", """
        CREATE TABLE IF NOT EXISTS stock_features (
            company_id     INTEGER NOT NULL REFERENCES companies(id),
            date           DATE    NOT NULL,
            sma_20         NUMERIC,
            sma_50         NUMERIC,
            ema_12         NUMERIC,
            ema_26         NUMERIC,
            rsi_14         NUMERIC,
            macd           NUMERIC,
            macd_signal    NUMERIC,
            macd_hist      NUMERIC,
            atr_14         NUMERIC,
            bb_upper       NUMERIC,
            bb_lower       NUMERIC,
            obv            NUMERIC,
            vwap_deviation NUMERIC,
            computed_at    TIMESTAMPTZ DEFAULT now(),
            PRIMARY KEY (company_id, date)
        );
    """),

    ("index: idx_features_company_date", """
        CREATE INDEX IF NOT EXISTS idx_features_company_date
            ON stock_features (company_id, date DESC);
    """),

    ("table: stock_ohlcv", """
        CREATE TABLE IF NOT EXISTS stock_ohlcv (
            ticker TEXT    NOT NULL,
            date   DATE    NOT NULL,
            open   NUMERIC,
            high   NUMERIC,
            low    NUMERIC,
            close  NUMERIC,
            volume BIGINT,
            PRIMARY KEY (ticker, date)
        );
    """),

    ("table: models", """
        CREATE TABLE IF NOT EXISTS models (
            model_id   SERIAL PRIMARY KEY,
            symbol     VARCHAR(10),
            accuracy   NUMERIC,
            created_at TIMESTAMP DEFAULT now()
        );
    """),

    ("table: jobs", """
        CREATE TABLE IF NOT EXISTS jobs (
            id           SERIAL      PRIMARY KEY,
            job_type     job_type    NOT NULL,
            payload      JSONB       NOT NULL DEFAULT '{}',
            status       job_status  NOT NULL DEFAULT 'pending',
            priority     INTEGER     NOT NULL DEFAULT 5,
            attempts     INTEGER     NOT NULL DEFAULT 0,
            max_attempts INTEGER     NOT NULL DEFAULT 3,
            error_msg    TEXT,
            created_at   TIMESTAMPTZ DEFAULT now(),
            started_at   TIMESTAMPTZ,
            finished_at  TIMESTAMPTZ
        );
    """),

    ("index: idx_jobs_pending", """
        CREATE INDEX IF NOT EXISTS idx_jobs_pending
            ON jobs (priority, created_at)
            WHERE status = 'pending';
    """),

    ("column: jobs.tags", """
        ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
    """),

    ("column: jobs.paused_at", """
        ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
    """),

    ("column: jobs.rq_job_id", """
        ALTER TABLE jobs
            ADD COLUMN IF NOT EXISTS rq_job_id TEXT;
    """),

    ("index: idx_jobs_tags (GIN)", """
        CREATE INDEX IF NOT EXISTS idx_jobs_tags
            ON jobs USING GIN (tags);
    """),

    ("index: idx_jobs_status_created", """
        CREATE INDEX IF NOT EXISTS idx_jobs_status_created
            ON jobs (status, created_at DESC);
    """),

    ("enum: job_type add train_model (idempotent)", """
        DO $$ BEGIN
            ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'train_model';
        EXCEPTION WHEN others THEN NULL;
        END $$;
    """),
]


def run_migrations():
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
    except Exception as e:
        print(f"  Connection failed: {e}", file=sys.stderr)
        sys.exit(1)

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    passed = 0
    failed = 0

    for label, sql in MIGRATIONS:
        try:
            cur.execute(sql)
            print(f"  ok  {label}")
            passed += 1
        except Exception as e:
            print(f"  ERR {label}: {e}", file=sys.stderr)
            failed += 1

    cur.close()
    conn.close()

    print(f"\n{passed} ok, {failed} failed.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()
