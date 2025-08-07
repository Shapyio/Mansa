from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest
from alpaca.data.timeframe import TimeFrame

import os
from dotenv import load_dotenv
import datetime

# Load .env file
load_dotenv()

client = StockHistoricalDataClient(
    api_key=os.getenv("ALPACA_API_KEY"),
    secret_key=os.getenv("ALPACA_SECRET_KEY")
)

# Set request parameters for daily bars
request_params = StockBarsRequest(
    symbol_or_symbols="AMD",
    timeframe=TimeFrame.Day,
    start=datetime.datetime(2025, 1, 1),
    end=datetime.datetime(2025, 8, 6),
    feed="iex"
)

# Fetch data and convert to Pandas DataFrame
stock_bars = client.get_stock_bars(request_params).df
print(stock_bars)