"""Train a forecasting model for a single symbol."""

from app.jobs._audit import tracked


@tracked
def train_model(symbol: str = None, **_ignored):
    if not symbol:
        raise ValueError("train_model requires symbol")
    # TODO: wire to backend/core/models trainer
    return {"symbol": symbol, "accuracy": None, "stub": True}
