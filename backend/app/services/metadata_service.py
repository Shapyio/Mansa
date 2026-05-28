"""
Pulls company info from FinancialModelingPrep (FMP) and saves it.

upsert_company_metadata() does everything: fetch, look up or create
sector/industry rows, update the `companies` row, and write a snapshot
to `company_metadata`. A 429 turns into a paused job for the scheduler
to retry tomorrow.
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
    """4xx from FMP — usually a bad symbol or bad key. Don't retry."""


def _api_key() -> str:
    key = os.getenv("FMP_API_KEY")
    if not key:
        raise RuntimeError("FMP_API_KEY is not set (check .env)")
    return key


def _call_with_retry(fn: Callable[[], T], *, max_attempts: int = 4, base_delay: float = 1.0) -> T:
    """Retry an FMP call with backoff. 429 and 4xx skip the retry loop."""
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except FMPClientError:
            raise  # bad request — no point retrying
        except TokenBudgetExceeded:
            raise  # let @tracked pause the job
        except (requests.RequestException, RuntimeError) as e:
            if attempt == max_attempts:
                raise
            delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
            log.warning("FMP hiccup, retry %d/%d in %.1fs: %s",
                        attempt, max_attempts, delay, e)
            time.sleep(delay)
    raise RuntimeError("unreachable")


def fetch_company_profile(symbol: str) -> Optional[dict]:
    """Hit FMP /profile and return the first match (or None)."""
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
        # FMP wraps the profile in a one-element list.
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
    """Fetch + write the companies row + add a dated snapshot row."""
    symbol = symbol.upper().strip()
    profile = fetch_company_profile(symbol)
    if not profile:
        log.info("FMP returned no profile for %s", symbol)
        return {"symbol": symbol, "updated": False, "reason": "no profile"}

    today = dt.date.today()

    with engine.begin() as conn:
        sector_id   = _get_or_create_id(conn, "sectors",    profile.get("sector"))
        industry_id = _get_or_create_id(conn, "industries", profile.get("industry"))

        # Update the company's main row. ON CONFLICT makes re-runs safe.
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

        # Dated snapshot row. Re-running today just overwrites today's row.
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
