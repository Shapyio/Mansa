"""
CLI wrapper around app.services.features_service.

Examples:
    # One company by id
    python scripts/stock_features.py --company-id 123

    # By symbol
    python scripts/stock_features.py AAPL

    # Backfill every company that has at least the minimum bars
    python scripts/stock_features.py --all

The single-company path is also exposed via the `compute_features` RQ job
(see app/jobs/compute_features.py); --all is a one-shot backfill before
the scheduler is fully wired.
"""

import argparse
import logging
import sys
from pathlib import Path

# Make `app.*` importable when run as a script
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

from app.infrastructure.database import engine                      # noqa: E402
from app.services.features_service import compute_for_company       # noqa: E402


def _all_companies() -> list[tuple[int, str]]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT id, symbol FROM companies ORDER BY symbol")
        ).fetchall()
    return [(r.id, r.symbol) for r in rows]


def _resolve_company(symbol: str) -> tuple[int, str]:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT id, symbol FROM companies WHERE symbol = :s"),
            {"s": symbol.upper()},
        ).fetchone()
    if not row:
        raise SystemExit(f"No company with symbol={symbol!r}")
    return (row.id, row.symbol)


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("symbol", nargs="?", help="Single symbol to compute")
    p.add_argument("--company-id", type=int, help="Single company id")
    p.add_argument("--all", action="store_true",
                   help="Compute features for every company")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s")

    if args.all:
        companies = _all_companies()
        print(f"Computing features for {len(companies)} companies")
        for cid, sym in companies:
            try:
                print(compute_for_company(cid, sym))
            except Exception as e:
                print(f"  {sym}: {e}", file=sys.stderr)
        return

    if args.company_id is not None:
        print(compute_for_company(args.company_id))
        return

    if args.symbol:
        cid, sym = _resolve_company(args.symbol)
        print(compute_for_company(cid, sym))
        return

    p.error("Pass a symbol, --company-id, or --all")


if __name__ == "__main__":
    main()
