"""Refresh company metadata (sector, industry, market cap, etc.)."""

from app.jobs._audit import tracked


@tracked
def update_metadata(company_id: int = None, symbol: str = None, **_ignored):
    if company_id is None and symbol is None:
        raise ValueError("update_metadata requires company_id or symbol")
    # TODO: wire to backend/core/ingestion company-metadata fetcher
    return {"company_id": company_id, "symbol": symbol, "stub": True}
