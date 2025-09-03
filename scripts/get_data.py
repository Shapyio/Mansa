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

# Request parameters
request_params = StockBarsRequest(
    symbol_or_symbols="AAPL",
    timeframe=TimeFrame.Day,
    start=datetime.datetime(2025, 1, 1),
    end=datetime.datetime(2025, 8, 6),
    feed="iex"
)

# Get DataFrame from API
df = client.get_stock_bars(request_params).df.reset_index()

# --- DataFrame Cleanup ---
df.rename(columns={
    'timestamp': 'timestamp',
    'symbol': 'symbol',
    'open': 'open',
    'high': 'high',
    'low': 'low',
    'close': 'close',
    'volume': 'volume',
    'trade_count': 'trade_count',
    'vwap': 'vwap'
}, inplace=True)

# Ensure column order matches DB schema
df = df[['timestamp', 'symbol', 'open', 'high', 'low', 'close', 'volume', 'trade_count', 'vwap']]

# --- Connect to TimescaleDB ---
db_user = os.getenv("POSTGRES_USER", "postgres")
db_pass = os.getenv("POSTGRES_PASSWORD", "password")
db_host = os.getenv("POSTGRES_HOST", "db")
db_port = os.getenv("POSTGRES_PORT", "5432")
db_name = os.getenv("POSTGRES_DB", "stockdb")

DATABASE_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
engine = create_engine(DATABASE_URL)

# --- Insert with UPSERT logic --- 
# Upsert avoids conflicting data
insert_query = text("""
    INSERT INTO stock_data (timestamp, symbol, open, high, low, close, volume, trade_count, vwap)
    VALUES (:timestamp, :symbol, :open, :high, :low, :close, :volume, :trade_count, :vwap)
    ON CONFLICT (timestamp, symbol)
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

print(f"Upserted {len(df)} rows into 'stock_data'")
