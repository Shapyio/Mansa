"""
CLI wrapper around app.services.ohlcv_service.fetch_and_upsert.

Examples:
    python scripts/get_data.py AAPL 2010-01-01 2025-09-07
    python scripts/get_data.py AAPL 2024-01-01 2024-12-31 --feed sip
"""

import argparse
import logging
import sys
from pathlib import Path

# Make `app.*` importable when run as a script
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv

load_dotenv()

from app.services.ohlcv_service import fetch_and_upsert  # noqa: E402


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("symbol")
    p.add_argument("start", help="YYYY-MM-DD")
    p.add_argument("end",   help="YYYY-MM-DD")
    p.add_argument("--feed", default="iex", choices=["iex", "sip"])
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    result = fetch_and_upsert(args.symbol, args.start, args.end, feed=args.feed)
    print(result)


if __name__ == "__main__":
    main()
