-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

\echo 'Creating lookup tables: sectors and industries'
CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(25) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS industries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

\echo 'Creating table: companies'
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100),
    sector_id INT REFERENCES sectors(id),
    industry_id INT REFERENCES industries(id),
    country VARCHAR(50),
    state VARCHAR(25),
    city VARCHAR(25)
);

\echo 'Creating table: stock_data'
CREATE TABLE IF NOT EXISTS stock_data (
    company_id INT NOT NULL REFERENCES companies(id),
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC,
    high NUMERIC,
    low NUMERIC,
    close NUMERIC,
    volume BIGINT,
    PRIMARY KEY (company_id, timestamp)
);

-- TimescaledDB Hyper table for look up
\echo 'Converting stock_data to hypertable...'
DO $$
BEGIN
    BEGIN
        PERFORM create_hypertable(
            'stock_data',
            'timestamp',
            'company_id',
            number_partitions => 4,
            if_not_exists => TRUE
        );
        RAISE NOTICE 'Hypertable created.';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create hypertable: %', SQLERRM;
    END;
END;
$$;

\echo 'Creating table: company_metadata'
CREATE TABLE IF NOT EXISTS company_metadata (
    company_id INTEGER NOT NULL REFERENCES companies(id),
    metadata_updated_at DATE NOT NULL,
    market_cap BIGINT,
    pe_ratio NUMERIC,
    dividend_yield NUMERIC,
    employees INTEGER,
    PRIMARY KEY (company_id, metadata_updated_at)
);

-- Creating features table on init
-- One row per ticker × date
CREATE TABLE stock_features (
    company_id      INTEGER     NOT NULL REFERENCES companies(id),
    date            DATE        NOT NULL,

    -- Trend
    sma_20          NUMERIC,
    sma_50          NUMERIC,
    ema_12          NUMERIC,
    ema_26          NUMERIC,

    -- Momentum
    rsi_14          NUMERIC,
    macd            NUMERIC,
    macd_signal     NUMERIC,
    macd_hist       NUMERIC,

    -- Volatility
    atr_14          NUMERIC,
    bb_upper        NUMERIC,    -- Bollinger Band upper
    bb_lower        NUMERIC,

    -- Volume
    obv             NUMERIC,    -- On-Balance Volume
    vwap_deviation  NUMERIC,    -- % deviation from daily VWAP

    computed_at     TIMESTAMPTZ DEFAULT now(),

    PRIMARY KEY (company_id, date)
);

-- Index for fast time-range queries per company
CREATE INDEX idx_features_company_date ON stock_features (company_id, date DESC);

-- Separate table for raw OHLCV if you want to recompute features later
CREATE TABLE stock_ohlcv (
    ticker  TEXT    NOT NULL,
    date    DATE    NOT NULL,
    open    NUMERIC,
    high    NUMERIC,
    low     NUMERIC,
    close   NUMERIC,
    volume  BIGINT,
    PRIMARY KEY (ticker, date)
);

-- Models table
\echo 'Creating table: models'
CREATE TABLE models (
    model_id SERIAL PRIMARY KEY,
    symbol VARCHAR(10),
    accuracy NUMERIC,
    created_at TIMESTAMP DEFAULT now()
);

-- Jobs table
CREATE TYPE job_status AS ENUM ('pending', 'running', 'done', 'failed');
CREATE TYPE job_type   AS ENUM ('import_ohlcv', 'fill_gap', 'update_metadata', 'compute_features');

CREATE TABLE jobs (
    id          SERIAL PRIMARY KEY,
    job_type    job_type    NOT NULL,
    payload     JSONB       NOT NULL DEFAULT '{}',
    status      job_status  NOT NULL DEFAULT 'pending',
    priority    INTEGER     NOT NULL DEFAULT 5,   -- lower = higher priority
    attempts    INTEGER     NOT NULL DEFAULT 0,
    max_attempts INTEGER    NOT NULL DEFAULT 3,
    error_msg   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_pending ON jobs (priority, created_at)
    WHERE status = 'pending';

\echo 'All tables created.'