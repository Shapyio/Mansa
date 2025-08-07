# get_data.py
import os
from dotenv import load_dotenv
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame
import pandas as pd
from datetime import datetime, timedelta

# Load .env variables
load_dotenv()

# Read credentials from environment
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")

# Validate credentials
if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
    raise ValueError("Missing Alpaca credentials in .env")

# Create client
client = StockHistoricalDataClient(ALPACA_API_KEY, ALPACA_SECRET_KEY)

# Request parameters
request_params = StockBarsRequest(
    symbol_or_symbols=["AAPL"],
    timeframe=TimeFrame.Day,
    start=datetime.now() - timedelta(days=30),
    end=datetime.now()
)

# Fetch and convert
barset = client.get_stock_bars(request_params)
df = barset.df.reset_index()
print(df.head())

# Save to CSV
os.makedirs("data", exist_ok=True)
df.to_csv("data/AAPL_stock_data.csv", index=False)
