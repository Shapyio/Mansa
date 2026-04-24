import os
import pandas as pd
import pandas_ta as ta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = (
    f"postgresql://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}"
    f"@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT')}/{os.getenv('POSTGRES_DB')}"
)
engine = create_engine(DATABASE_URL)


def compute_for_company(company_id: int, symbol: str):
    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT date(timestamp) as date, open, high, low, close, volume, vwap
                FROM stock_data
                WHERE company_id = :cid
                ORDER BY timestamp ASC
            """),
            conn,
            params={"cid": company_id}
        )

    if df.empty or len(df) < 50:
        print(f"  Skipping {symbol} — insufficient data ({len(df)} rows)")
        return

    df = df.set_index("date")

    # --- Compute features ---
    df["sma_20"]     = ta.sma(df["close"], length=20)
    df["sma_50"]     = ta.sma(df["close"], length=50)
    df["ema_12"]     = ta.ema(df["close"], length=12)
    df["ema_26"]     = ta.ema(df["close"], length=26)
    df["rsi_14"]     = ta.rsi(df["close"], length=14)
    df["atr_14"]     = ta.atr(df["high"], df["low"], df["close"], length=14)
    df["obv"]        = ta.obv(df["close"], df["volume"])

    macd = ta.macd(df["close"])
    df["macd"]       = macd["MACD_12_26_9"]
    df["macd_signal"]= macd["MACDs_12_26_9"]
    df["macd_hist"]  = macd["MACDh_12_26_9"]

    bb = ta.bbands(df["close"], length=20)
    df["bb_upper"]   = bb["BBU_20_2.0"]
    df["bb_lower"]   = bb["BBL_20_2.0"]

    df["vwap_deviation"] = ((df["close"] - df["vwap"]) / df["vwap"] * 100).round(4)

    df = df.dropna(subset=["sma_20", "rsi_14"])
    df["company_id"] = company_id
    df = df.reset_index()

    # --- Upsert ---
    upsert_sql = text("""
        INSERT INTO stock_features (
            company_id, date,
            sma_20, sma_50, ema_12, ema_26,
            rsi_14, macd, macd_signal, macd_hist,
            atr_14, bb_upper, bb_lower, obv, vwap_deviation
        )
        VALUES (
            :company_id, :date,
            :sma_20, :sma_50, :ema_12, :ema_26,
            :rsi_14, :macd, :macd_signal, :macd_hist,
            :atr_14, :bb_upper, :bb_lower, :obv, :vwap_deviation
        )
        ON CONFLICT (company_id, date) DO UPDATE SET
            sma_20 = EXCLUDED.sma_20,
            rsi_14 = EXCLUDED.rsi_14,
            macd   = EXCLUDED.macd,
            computed_at = now();
    """)

    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(upsert_sql, row.to_dict())

    print(f"  {symbol}: {len(df)} feature rows upserted")


def main():
    with engine.connect() as conn:
        companies = conn.execute(
            text("SELECT id, symbol FROM companies WHERE name IS NOT NULL")
        ).fetchall()

    for company_id, symbol in companies:
        print(f"Computing features for {symbol}")
        compute_for_company(company_id, symbol)


if __name__ == "__main__":
    main()