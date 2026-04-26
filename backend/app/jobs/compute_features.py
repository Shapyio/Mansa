"""Recompute technical features (SMA, RSI, MACD, etc.) for a company."""

from app.jobs._audit import tracked


@tracked
def compute_features(company_id: int = None, symbol: str = None, **_ignored):
    if company_id is None:
        raise ValueError("compute_features requires company_id")
    # TODO: wire to backend/core/features once implemented
    return {"company_id": company_id, "symbol": symbol, "stub": True}
