"""
Company metadata ingestion via FinancialModelingPrep (FMP).

Mirrors the structure of `ohlcv_service.py` so handlers stay symmetric:
  - 429 -> TokenBudgetExceeded (worker parks the job in 'paused')
  - 5xx -> retried with exponential backoff
  - 4xx -> raised immediately

`upsert_company_metadata(symbol)` is the public entrypoint. It:
  1. Fetches the company profile from FMP.
  2. Resolves sector_id / industry_id (creating rows if new).
  3. Updates the denormalized `companies` row (name, sector, industry, etc.).
  4. Inserts a dated snapshot into `company_metadata`.
  5. Bumps `companies.metadata_updated_at` so the staleness checker stops
     flagging it.
"""

import datetime as dt
import logging
import os
import random
import time
from typing import Callable, Optional, TypeVar

import requests
from sqlalchemy import text

from app.infrastructure.database import engine
from app.jobs._audit import TokenBudgetExceeded

log = logging.getLogger(__name__)

FMP_BASE = "https://financialmodelingprep.com/stable"

T = TypeVar("T")


class FMPClientError(RuntimeError):
    """4xx response from FMP that we don't want to retry (bad symbol, bad key)."""


def _api_key() -> str:
    key = os.getenv("FMP_API_KEY")
    if not key:
        raise RuntimeError("FMP_API_KEY is not set (check .env)")
    return key


def _call_with_retry(fn: Callable[[], T], *, max_attempts: int = 4, base_delay: float = 1.0) -> T:
    """Mirror of `alpaca.call_with_retry` for FMP HTTP errors."""
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except FMPClientError:
            raise  # 4xx, don't retry
        except TokenBudgetExceeded:
            raise  # propagate upward; @tracked will park the job
        except (requests.RequestException, RuntimeError) as e:
            if attempt == max_attempts:
                raise
            delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
            log.warning("FMP transient error, retry %d/%d in %.1fs: %s",
                        attempt, max_attempts, delay, e)
            time.sleep(delay)
    raise RuntimeError("unreachable")


def fetch_company_profile(symbol: str) -> Optional[dict]:
    """Fetch FMP `/profile` for a symbol. Returns the first match or None."""
    symbol = symbol.upper().strip()

    def _do() -> Optional[dict]:
        url = f"{FMP_BASE}/profile"
        params = {"symbol": symbol, "apikey": _api_key()}
        r = requests.get(url, params=params, timeout=10)

        if r.status_code == 429:
            raise TokenBudgetExceeded(f"FMP rate-limited (429) for {symbol}")
        if 400 <= r.status_code < 500:
            raise FMPClientError(f"FMP {r.status_code} for {symbol}: {r.text[:200]}")
        if r.status_code >= 500:
            raise RuntimeError(f"FMP {r.status_code}: {r.text[:200]}")

        data = r.json()
        if not data:
            return None
        # FMP returns an array; take the first matching record.
        return data[0] if isinstance(data, list) else data

    return _call_with_retry(_do)


def _get_or_create_id(conn, table: str, name: Optional[str]) -> Optional[int]:
    if not name:
        return None
    row = conn.execute(
        text(f"""
            INSERT INTO {table} (name) VALUES (:n)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """),
        {"n": name},
    ).fetchone()
    return row[0]


def _safe_int(v) -> Optional[int]:
    try:
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _safe_float(v) -> Optional[float]:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def upsert_company_metadata(symbol: str) -> dict:
    """End-to-end: fetch + upsert sector/industry + update companies + snapshot."""
    symbol = symbol.upper().strip()
    profile = fetch_company_profile(symbol)
    if not profile:
        log.info("FMP returned no profile for %s", symbol)
        return {"symbol": symbol, "updated": False, "reason": "no profile"}

    today = dt.date.today()

    with engine.begin() as conn:
        sector_id   = _get_or_create_id(conn, "sectors",    profile.get("sector"))
        industry_id = _get_or_create_id(conn, "industries", profile.get("industry"))

        # Denormalized "current" view on companies. ON CONFLICT handles re-run.
        conn.execute(
            text("""
                INSERT INTO companies
                    (symbol, name, sector_id, industry_id, country, state, city,
                     exchange, metadata_updated_at)
                VALUES
                    (:symbol, :name, :sector_id, :industry_id, :country, :state, :city,
                     :exchange, now())
                ON CONFLICT (symbol) DO UPDATE SET
                    name                = EXCLUDED.name,
                    sector_id           = EXCLUDED.sector_id,
                    industry_id         = EXCLUDED.industry_id,
                    country             = EXCLUDED.country,
                    state               = EXCLUDED.state,
                    city                = EXCLUDED.city,
                    exchange            = EXCLUDED.exchange,
                    metadata_updated_at = now()
            """),
            {
                "symbol":      symbol,
                "name":        profile.get("companyName") or profile.get("name"),
                "sector_id":   sector_id,
                "industry_id": industry_id,
                "country":     profile.get("country"),
                "state":       profile.get("state"),
                "city":        profile.get("city"),
                "exchange":    profile.get("exchangeShortName") or profile.get("exchange"),
            },
        )

        company_id = conn.execute(
            text("SELECT id FROM companies WHERE symbol = :s"),
            {"s": symbol},
        ).fetchone()[0]

        # Time-series snapshot. Re-running the same day overwrites the row.
        conn.execute(
            text("""
                INSERT INTO company_metadata
                    (company_id, metadata_updated_at, market_cap, pe_ratio,
                     dividend_yield, employees)
                VALUES
                    (:cid, :asof, :mc, :pe, :dy, :emp)
                ON CONFLICT (company_id, metadata_updated_at) DO UPDATE SET
                    market_cap     = EXCLUDED.market_cap,
                    pe_ratio       = EXCLUDED.pe_ratio,
                    dividend_yield = EXCLUDED.dividend_yield,
                    employees      = EXCLUDED.employees
            """),
            {
                "cid":  company_id,
                "asof": today,
                "mc":   _safe_int(profile.get("mktCap") or profile.get("marketCap")),
                "pe":   _safe_float(profile.get("pe") or profile.get("peRatio")),
                "dy":   _safe_float(profile.get("lastDiv") or profile.get("dividendYield")),
                "emp":  _safe_int(profile.get("fullTimeEmployees") or profile.get("employees")),
            },
        )

    log.info("Updated metadata for %s (sector=%s industry=%s)",
             symbol, profile.get("sector"), profile.get("industry"))
    return {"symbol": symbol, "company_id": company_id, "updated": True}


def resolve_symbol(company_id: int) -> str:
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT symbol FROM companies WHERE id = :id"),
            {"id": company_id},
        ).fetchone()
    if not row:
        raise ValueError(f"No company with id={company_id}")
    return row[0]
