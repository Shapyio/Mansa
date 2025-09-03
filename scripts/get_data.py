from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame

from sqlalchemy import create_engine, text
import pandas as pd
import os
from dotenv import load_dotenv
import datetime

# Load .env for API + DB creds
load_dotenv()

# --- Alpaca API ---
client = StockHistoricalDataClient(
    api_key=os.getenv("ALPACA_API_KEY"),
    secret_key=os.getenv("ALPACA_SECRET_KEY")
)

# Choose ticker
symbol = "AAPL"

# Request parameters
request_params = StockBarsRequest(
    symbol_or_symbols=symbol,
    timeframe=TimeFrame.Day,
    start=datetime.datetime(2025, 8, 27),
    end=datetime.datetime(2025, 9, 3),
    feed="iex"
)

# Get DataFrame from API
df = client.get_stock_bars(request_params).df.reset_index()

# --- DataFrame Cleanup ---
df.rename(columns={
    "timestamp": "timestamp",
    "symbol": "symbol",
    "open": "open",
    "high": "high",
    "low": "low",
    "close": "close",
    "volume": "volume",
    "trade_count": "trade_count",
    "vwap": "vwap",
}, inplace=True)

df = df[["timestamp", "symbol", "open", "high", "low", "close", "volume", "trade_count", "vwap"]]

# --- Connect to TimescaleDB ---
db_user = os.getenv("POSTGRES_USER", "postgres")
db_pass = os.getenv("POSTGRES_PASSWORD", "password")
db_host = os.getenv("POSTGRES_HOST", "db")
db_port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "stockdb")

DATABASE_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
engine = create_engine(DATABASE_URL)

# --- Ensure company exists ---
with engine.begin() as conn:
    result = conn.execute(
        text("SELECT id FROM companies WHERE symbol = :s"),
        {"s": symbol}
    ).fetchone()

    if not result:
        # Insert company if missing
        conn.execute(
            text("INSERT INTO companies (symbol, name) VALUES (:s, :n) ON CONFLICT (symbol) DO NOTHING"),
            {"s": symbol, "n": f"{symbol} Inc."}
        )
        result = conn.execute(
            text("SELECT id FROM companies WHERE symbol = :s"),
            {"s": symbol}
        ).fetchone()

    company_id = result[0]

# --- Add company_id to DataFrame ---
df["company_id"] = company_id
df = df[["company_id", "timestamp", "open", "high", "low", "close", "volume", "trade_count", "vwap"]]

# --- Insert with UPSERT logic ---
# Upsert ensures stocks won't conflict with new data
insert_query = text("""
    INSERT INTO stock_data (company_id, timestamp, open, high, low, close, volume, trade_count, vwap)
    VALUES (:company_id, :timestamp, :open, :high, :low, :close, :volume, :trade_count, :vwap)
    ON CONFLICT (company_id, timestamp)
    DO UPDATE SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume,
        trade_count = EXCLUDED.trade_count,
        vwap = EXCLUDED.vwap;
""")

with engine.begin() as conn:
    for _, row in df.iterrows():
        conn.execute(insert_query, row.to_dict())

print(f"Upserted {len(df)} rows for {symbol} into 'stock_data'")
