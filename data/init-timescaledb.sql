-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

\echo 'Creating table: stock_data'
CREATE TABLE IF NOT EXISTS stock_data (
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL PRIMARY KEY,
    open NUMERIC,
    high NUMERIC,
    low NUMERIC,
    close NUMERIC,
    volume BIGINT,
    trade_count INTEGER,
    vwap NUMERIC
);

-- Having trouble making hypertable for some reason...
\echo 'Converting stock_data to hypertable...'
DO $$
BEGIN
    BEGIN
        PERFORM create_hypertable('stock_data', 'timestamp', if_not_exists => TRUE);
        RAISE NOTICE 'Hypertable created.';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to create hypertable: %', SQLERRM;
    END;
END;
$$;

\echo 'Creating table: companies'
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    name TEXT,
    sector TEXT,
    industry TEXT,
    country TEXT
);

\echo 'Creating table: company_metadata'
CREATE TABLE IF NOT EXISTS company_metadata (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id),
    date DATE NOT NULL,
    market_cap BIGINT,
    pe_ratio NUMERIC,
    dividend_yield NUMERIC,
    employees INTEGER,
    UNIQUE (company_id, date)
);

\echo 'All tables created.'
