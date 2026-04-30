"""Refresh company metadata (name, sector, industry, market cap, etc.) via FMP."""

from app.jobs._audit import tracked
from app.services.metadata_service import resolve_symbol, upsert_company_metadata


@tracked
def update_metadata(company_id: int = None, symbol: str = None, **_ignored):
    if not symbol and company_id is None:
        raise ValueError("update_metadata requires company_id or symbol")

    sym = symbol or resolve_symbol(company_id)
    return upsert_company_metadata(sym)
