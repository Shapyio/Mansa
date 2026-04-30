"""
CLI wrapper around app.services.metadata_service.

Usage:
    # Refresh one symbol
    python scripts/get_company_data.py AAPL

    # Refresh every company missing a name (or whose metadata is older than N days)
    python scripts/get_company_data.py --stale --days 90

The single-symbol path is also exposed via the `update_metadata` RQ job
(see app/jobs/update_metadata.py); the --stale path is here for one-off
backfills before the scheduler is in place.
"""

import argparse
import logging
import sys
import time
from pathlib import Path

# Make `app.*` importable when run as a script
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

from app.infrastructure.database import engine                      # noqa: E402
from app.services.metadata_service import upsert_company_metadata   # noqa: E402


def _stale_symbols(days: int) -> list[str]:
    with engine.connect() as conn:
        rows = conn.execute(text(f"""
            SELECT symbol FROM companies
            WHERE name IS NULL OR name = '' OR name = symbol
               OR metadata_updated_at IS NULL
               OR metadata_updated_at < now() - interval '{int(days)} days'
            ORDER BY metadata_updated_at NULLS FIRST, symbol
        """)).fetchall()
    return [r.symbol for r in rows]


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("symbol", nargs="?", help="Single symbol to refresh")
    p.add_argument("--stale", action="store_true",
                   help="Refresh every company with missing or old metadata")
    p.add_argument("--days", type=int, default=90,
                   help="Staleness threshold in days (used with --stale)")
    p.add_argument("--sleep", type=float, default=0.25,
                   help="Seconds to sleep between calls (rate-limit cushion)")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")

    if args.stale:
        symbols = _stale_symbols(args.days)
        print(f"Refreshing {len(symbols)} companies (>{args.days}d stale or missing)")
        for sym in symbols:
            try:
                print(upsert_company_metadata(sym))
            except Exception as e:
                print(f"  {sym}: {e}", file=sys.stderr)
            time.sleep(args.sleep)
        return

    if not args.symbol:
        p.error("Pass a symbol, or use --stale to refresh all stale companies")
    print(upsert_company_metadata(args.symbol))


if __name__ == "__main__":
    main()
