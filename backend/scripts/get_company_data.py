import os
import sys
import time
from datetime import datetime

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

load_dotenv()

API_KEY = os.getenv("FMP_API_KEY")

# All values come from env (.env / secrets.env / docker-compose).
# We refuse to start without a real password instead of falling back silently.
_PG_PASSWORD = os.getenv("POSTGRES_PASSWORD")
if not _PG_PASSWORD:
    print("ERROR: POSTGRES_PASSWORD is not set (check secrets.env).", file=sys.stderr)
    sys.exit(1)

DB_CONFIG = {
    "host":     os.getenv("POSTGRES_HOST", "db"),
    "port":     int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB",   "stockdb"),
    "user":     os.getenv("POSTGRES_USER", "postgres"),
    "password": _PG_PASSWORD,
}


def get_company_data(symbol):
    url = f"https://financialmodelingprep.com/stable/profile?symbol={symbol}&apikey={API_KEY}"
    response = requests.get(url, timeout=10) # Wait time out to try to avoid call limits

    # Error throw
    if response.status_code != 200:
        print(f"HTTP error {response.status_code} for {symbol}")
        return None

    data = response.json()

    if not data:
        return None

    # Only keep NASDAQ listings
    for item in data:
            return item

    return None


def get_or_create_id(cursor, table, name):
    cursor.execute(
        f"""
        INSERT INTO {table} (name)
        VALUES (%s)
        ON CONFLICT (name)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
        """,
        (name,)
    )
    return cursor.fetchone()["id"]


def upsert_company(cursor, company):
    industry_id = get_or_create_id(cursor, "industries", company.get("industry"))
    sector_id = get_or_create_id(cursor, "sectors", company.get("sector"))

    cursor.execute(
        """
        INSERT INTO companies (
            symbol,
            name,
            industry_id,
            sector_id,
            country,
            state,
            city,
            exchange
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (symbol)
        DO UPDATE SET
            name = EXCLUDED.name,
            industry_id = EXCLUDED.industry_id,
            sector_id = EXCLUDED.sector_id,
            country = EXCLUDED.country,
            state = EXCLUDED.state,
            city = EXCLUDED.city,
            exchange = EXCLUDED.exchange;
        """,
        (
            company.get("symbol"),
            company.get("companyName"),
            industry_id,
            sector_id,
            company.get("country"),
            company.get("state"),
            company.get("city"),
            company.get("exchange")
        )
    )

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False

    with conn.cursor(cursor_factory=RealDictCursor) as cursor:

        # Pull all tickers currently in your database
        cursor.execute("SELECT symbol FROM companies WHERE name is NULL OR name = '';")
        symbols = [row["symbol"] for row in cursor.fetchall()]

        print(f"Updating metadata for {len(symbols)} companies")

        for symbol in symbols:
            print(f"Processing {symbol}")

            company_data = get_company_data(symbol)

            if not company_data:
                print(f"No data found for {symbol}")
                continue

            upsert_company(cursor, company_data)
            conn.commit()

            time.sleep(0.25)  # prevent rate limit

    conn.close()


if __name__ == "__main__":
    main()