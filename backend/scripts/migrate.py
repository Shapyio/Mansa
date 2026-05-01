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

def _build_database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit
    user = os.getenv("POSTGRES_USER", "postgres")
    pw   = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST", "db")
    port = os.getenv("POSTGRES_PORT", "5432")
    db   = os.getenv("POSTGRES_DB", "stockdb")
    if not pw:
        print("ERROR: Set DATABASE_URL or POSTGRES_PASSWORD before running migrate.", file=sys.stderr)
        sys.exit(1)
    return f"postgresql://{user}:{pw}@{host}:{port}/{db}"


DATABASE_URL = _build_database_url()


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

    ("column: company_metadata drop legacy 'date' column", """
        -- Older schema used a NOT NULL `date` column instead of
        -- `metadata_updated_at`. Migrate values across, then drop it.
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'company_metadata' AND column_name = 'date'
            ) THEN
                ALTER TABLE company_metadata
                    ADD COLUMN IF NOT EXISTS metadata_updated_at DATE;

                UPDATE company_metadata
                   SET metadata_updated_at = COALESCE(metadata_updated_at, date);

                ALTER TABLE company_metadata DROP COLUMN date;
            END IF;
        END $$;
    """),

    ("column: company_metadata schema repair", """
        -- The CREATE TABLE block above is a no-op if company_metadata already
        -- exists from an earlier schema. Apply each column additively so old
        -- DBs catch up.
        ALTER TABLE company_metadata
            ADD COLUMN IF NOT EXISTS metadata_updated_at DATE,
            ADD COLUMN IF NOT EXISTS market_cap     BIGINT,
            ADD COLUMN IF NOT EXISTS pe_ratio       NUMERIC,
            ADD COLUMN IF NOT EXISTS dividend_yield NUMERIC,
            ADD COLUMN IF NOT EXISTS employees      INTEGER;

        UPDATE company_metadata SET metadata_updated_at = CURRENT_DATE
            WHERE metadata_updated_at IS NULL;

        ALTER TABLE company_metadata
            ALTER COLUMN metadata_updated_at SET NOT NULL;
    """),

    ("pk: company_metadata (company_id, metadata_updated_at)", """
        DO $$
        DECLARE
            pk_cols text;
        BEGIN
            SELECT string_agg(a.attname, ',' ORDER BY array_position(c.conkey, a.attnum))
              INTO pk_cols
              FROM pg_constraint c
              JOIN pg_class      t ON t.oid = c.conrelid
              JOIN pg_attribute  a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
             WHERE t.relname = 'company_metadata' AND c.contype = 'p';

            IF pk_cols IS DISTINCT FROM 'company_id,metadata_updated_at' THEN
                ALTER TABLE company_metadata DROP CONSTRAINT IF EXISTS company_metadata_pkey;
                ALTER TABLE company_metadata
                    ADD PRIMARY KEY (company_id, metadata_updated_at);
            END IF;
        END $$;
    """),

    ("column: companies.metadata_updated_at + exchange", """
        ALTER TABLE companies
            ADD COLUMN IF NOT EXISTS metadata_updated_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS exchange            VARCHAR(20);
    """),

    ("index: idx_companies_metadata_age", """
        CREATE INDEX IF NOT EXISTS idx_companies_metadata_age
            ON companies (metadata_updated_at NULLS FIRST);
    """),

    ("column: stock_data.trade_count + vwap", """
        ALTER TABLE stock_data
            ADD COLUMN IF NOT EXISTS trade_count BIGINT,
            ADD COLUMN IF NOT EXISTS vwap        NUMERIC;
    """),

    ("enum: job_type add train_model (idempotent)", """
        DO $$ BEGIN
            ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'train_model';
        EXCEPTION WHEN others THEN NULL;
        END $$;
    """),
]


def run_migrations():
    print("Connecting to database...")
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
