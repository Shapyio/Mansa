-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create stock_data table
CREATE TABLE IF NOT EXISTS stock_data (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open DOUBLE PRECISION,
    high DOUBLE PRECISION,
    low DOUBLE PRECISION,
    close DOUBLE PRECISION,
    volume BIGINT,
    trade_count INTEGER,
    vwap DOUBLE PRECISION
); -- NOTE: If too slow/large, partition table by symbol

-- Turn it into a hypertable for performance
SELECT create_hypertable('stock_data', 'timestamp', if_not_exists => TRUE);

-- Create company_info table
CREATE TABLE IF NOT EXISTS company_info (
    id SERIAL PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,      -- Ticker
    name TEXT NOT NULL,               -- Full name
    description TEXT,                 -- Company bio
    industry TEXT,
    sector TEXT,
    ceo TEXT,
    headquarters TEXT,
    founded_year INT
);

-- Create company_metrics table
CREATE TABLE IF NOT EXISTS company_metrics_history (
    id SERIAL PRIMARY KEY,
    symbol TEXT REFERENCES company_info(symbol) ON DELETE CASCADE,

    -- Financial data
    market_cap BIGINT,
    revenue BIGINT,
    net_income BIGINT,
    ebita BIGINT,
    debt BIGINT,
    assets BIGINT,
    equity BIGINT,

    -- Market data
    shares_outstanding BIGINT,
    free_float BIGINT,
    beta NUMERIC,
    dividend_yield NUMERIC,
    pe_ratio NUMERIC,

    -- Employee count (Variable company_info)
    employees INT,

    -- Timestamp of data
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- VIEWS
-- View of company currently
CREATE VIEW company_metrics_latest AS
SELECT cm.*
FROM company_metrics_history cm
JOIN (
    SELECT symbol, MAX(recorded_at) AS max_time
    FROM company_metrics_history
    GROUP BY symbol
) latest
ON cm.symbol = latest.symbol AND cm.recorded_at = latest.max_time;

-- View for latest metrics per company
CREATE VIEW latest_company_metrics AS
SELECT DISTINCT ON (symbol) *
FROM company_metrics_history
ORDER BY symbol, recorded_at DESC;

-- Add FK constraint after both tables exist
ALTER TABLE stock_data
ADD CONSTRAINT fk_symbol
FOREIGN KEY (symbol) REFERENCES company_info(symbol) ON DELETE CASCADE;

-- INDEXING
-- ...for querying a company’s historical metrics quickly
CREATE INDEX idx_metrics_symbol_time ON company_metrics_history(symbol, recorded_at DESC);

-- ...for other tables:
CREATE INDEX idx_prices_symbol_date ON stock_prices(symbol, price_date DESC);