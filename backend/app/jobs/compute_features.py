"""Recompute technical features (SMA, RSI, MACD, etc.) for a company."""

from app.jobs._audit import tracked
from app.services.features_service import compute_for_company


@tracked
def compute_features(company_id: int = None, symbol: str = None, **_ignored):
    if company_id is None:
        raise ValueError("compute_features requires company_id")
    return compute_for_company(company_id, symbol=symbol)
