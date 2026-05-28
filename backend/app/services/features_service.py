"""
Computes technical indicators for a company and writes them to stock_features.

Indicators: SMA(20), SMA(50), EMA(12), EMA(26), RSI(14), MACD(12,26,9),
ATR(14), Bollinger Bands(20, 2σ), OBV, VWAP-deviation %.

All done in plain pandas — no pandas-ta. Re-running just overwrites.
"""

import logging
import math
from typing import Optional

import pandas as pd
from sqlalchemy import text

from app.infrastructure.database import engine
from app.services.metadata_service import resolve_symbol

log = logging.getLogger(__name__)

# Below 50 bars every indicator would just be NaN, so we skip the company.
MIN_BARS = 50


# ---------------------------------------------------------------------------
# Indicator math
# ---------------------------------------------------------------------------

def _sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).mean()


def _ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def _rsi(close: pd.Series, n: int = 14) -> pd.Series:
    delta = close.diff()
    gain  = delta.clip(lower=0)
    loss  = (-delta).clip(lower=0)
    # Wilder smoothing == EMA with alpha = 1/n
    avg_gain = gain.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    avg_loss = loss.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    rs  = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    macd_line   = _ema(close, fast) - _ema(close, slow)
    signal_line = macd_line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    return macd_line, signal_line, macd_line - signal_line


def _atr(high: pd.Series, low: pd.Series, close: pd.Series, n: int = 14) -> pd.Series:
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low  - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()


def _bbands(close: pd.Series, n: int = 20, k: float = 2.0):
    mid = _sma(close, n)
    std = close.rolling(n, min_periods=n).std(ddof=0)
    return mid + k * std, mid - k * std


def _obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    direction = (close.diff().fillna(0) > 0).astype(int) - \
                (close.diff().fillna(0) < 0).astype(int)
    return (direction * volume).cumsum()


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def _load_ohlcv(company_id: int) -> pd.DataFrame:
    with engine.connect() as conn:
        df = pd.read_sql(
            text("""
                SELECT date(timestamp) AS date,
                       open, high, low, close, volume, vwap
                FROM stock_data
                WHERE company_id = :cid
                ORDER BY timestamp ASC
            """),
            conn,
            params={"cid": company_id},
        )
    # psycopg2 returns NUMERIC as Decimal; coerce to float so pandas math works.
    for col in ("open", "high", "low", "close", "volume", "vwap"):
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def _compute(df: pd.DataFrame) -> pd.DataFrame:
    df = df.set_index("date").copy()

    df["sma_20"] = _sma(df["close"], 20)
    df["sma_50"] = _sma(df["close"], 50)
    df["ema_12"] = _ema(df["close"], 12)
    df["ema_26"] = _ema(df["close"], 26)
    df["rsi_14"] = _rsi(df["close"], 14)
    df["atr_14"] = _atr(df["high"], df["low"], df["close"], 14)
    df["obv"]    = _obv(df["close"], df["volume"])

    macd, signal, hist = _macd(df["close"])
    df["macd"], df["macd_signal"], df["macd_hist"] = macd, signal, hist

    bb_upper, bb_lower = _bbands(df["close"], 20, 2.0)
    df["bb_upper"], df["bb_lower"] = bb_upper, bb_lower

    df["vwap_deviation"] = (
        (df["close"] - df["vwap"]) / df["vwap"] * 100
    ).where(df["vwap"].notna() & (df["vwap"] != 0)).round(4)

    # Drop bars where the longest-lookback indicators aren't ready yet.
    df = df.dropna(subset=["sma_20", "rsi_14"])
    return df.reset_index()


_FEATURE_COLS = [
    "sma_20", "sma_50", "ema_12", "ema_26",
    "rsi_14", "macd", "macd_signal", "macd_hist",
    "atr_14", "bb_upper", "bb_lower", "obv", "vwap_deviation",
]


_UPSERT_SQL = text(f"""
    INSERT INTO stock_features (
        company_id, date,
        {', '.join(_FEATURE_COLS)}
    ) VALUES (
        :company_id, :date,
        {', '.join(f':{c}' for c in _FEATURE_COLS)}
    )
    ON CONFLICT (company_id, date) DO UPDATE SET
        {', '.join(f'{c} = EXCLUDED.{c}' for c in _FEATURE_COLS)},
        computed_at = now()
""")


def _row_dict(company_id: int, row: pd.Series) -> dict:
    out: dict = {"company_id": company_id, "date": row["date"]}
    for col in _FEATURE_COLS:
        v = row.get(col)
        if v is None or (isinstance(v, float) and math.isnan(v)):
            out[col] = None
        else:
            out[col] = float(v)
    return out


def compute_for_company(company_id: int, symbol: Optional[str] = None) -> dict:
    """Recompute every feature row for one company.

    Usually triggered by fill_gap when new bars arrive, but you can also
    call it directly from the CLI or the Tools page.
    """
    # Callers with just a company_id shouldn't have to look up the symbol.
    sym = symbol or resolve_symbol(company_id)
    if sym is None:
        raise ValueError(f"No company with id={company_id}")

    raw = _load_ohlcv(company_id)
    if raw.empty or len(raw) < MIN_BARS:
        log.info("Skipping %s — only %d bars (< %d)", sym, len(raw), MIN_BARS)
        return {
            "company_id": company_id, "symbol": sym,
            "rows_upserted": 0, "skipped": "insufficient_data",
            "bars": int(len(raw)),
        }

    feats = _compute(raw)
    if feats.empty:
        return {"company_id": company_id, "symbol": sym,
                "rows_upserted": 0, "skipped": "no_features"}

    rows = [_row_dict(company_id, r) for _, r in feats.iterrows()]

    # One batched insert instead of a row-by-row loop.
    with engine.begin() as conn:
        conn.execute(_UPSERT_SQL, rows)

    log.info("Computed %d feature rows for %s", len(rows), sym)
    return {
        "company_id":     company_id,
        "symbol":         sym,
        "rows_upserted":  len(rows),
        "first_date":     str(feats["date"].iloc[0]),
        "last_date":      str(feats["date"].iloc[-1]),
    }
