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
    date DATE NOT NULL,
    market_cap BIGINT,
    pe_ratio NUMERIC,
    dividend_yield NUMERIC,
    employees INTEGER,
    PRIMARY KEY (company_id, date)
);

\echo 'All tables created.'
