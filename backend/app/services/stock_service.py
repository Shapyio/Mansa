from typing import Optional

from sqlalchemy import text


# ---------------------------------------------------------------------------
# List + filters
# ---------------------------------------------------------------------------

def list_stocks(
    db,
    sector_id:   Optional[int] = None,
    industry_id: Optional[int] = None,
    search:      Optional[str] = None,
    limit:       int = 10000,
):
    """
    One row per company with latest price, day-over-day delta, sector/industry
    names, and last data + metadata timestamps.
    """
    where = []
    params: dict = {"limit": limit}
    if sector_id is not None:
        where.append("c.sector_id = :sector_id")
        params["sector_id"] = sector_id
    if industry_id is not None:
        where.append("c.industry_id = :industry_id")
        params["industry_id"] = industry_id
    if search:
        where.append("(c.symbol ILIKE :q OR c.name ILIKE :q)")
        params["q"] = f"%{search}%"
    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    # LATERAL + ORDER BY timestamp DESC LIMIT 1 lets Postgres do a loose
    # index scan over (company_id, timestamp). On a hypertable this is
    # ~O(N_companies * log) instead of scanning every row.
    query = text(f"""
        SELECT
            c.id, c.symbol, c.name, c.exchange,
            sec.name AS sector, ind.name AS industry,
            c.sector_id, c.industry_id,
            latest.timestamp AS last_update,
            latest.close     AS last_price,
            latest.volume    AS volume,
            prev.close       AS prev_close,
            CASE WHEN prev.close IS NULL OR prev.close = 0 THEN NULL
                 ELSE (latest.close - prev.close) / prev.close * 100
            END AS day_change_pct,
            c.metadata_updated_at
        FROM companies c
        LEFT JOIN sectors    sec ON sec.id = c.sector_id
        LEFT JOIN industries ind ON ind.id = c.industry_id
        LEFT JOIN LATERAL (
            SELECT timestamp, close, volume
              FROM stock_data
             WHERE company_id = c.id
             ORDER BY timestamp DESC
             LIMIT 1
        ) latest ON true
        LEFT JOIN LATERAL (
            SELECT close
              FROM stock_data
             WHERE company_id = c.id
             ORDER BY timestamp DESC
             OFFSET 1 LIMIT 1
        ) prev ON true
        {where_sql}
        ORDER BY c.symbol
        LIMIT :limit
    """)
    return [dict(row._mapping) for row in db.execute(query, params)]


# ---------------------------------------------------------------------------
# Profile (one company, full detail)
# ---------------------------------------------------------------------------

def get_stock_profile(db, symbol: str) -> Optional[dict]:
    """Single-symbol query — scans only that company's rows, so heavy
    aggregates (52w hi/lo, all-time hi/lo, count) are cheap here."""
    sym = symbol.upper().strip()
    row = db.execute(text("""
        WITH this_co AS (
            SELECT id FROM companies WHERE symbol = :symbol
        ),
        latest AS (
            SELECT timestamp AS last_update, close AS last_price, volume AS last_volume
              FROM stock_data
             WHERE company_id = (SELECT id FROM this_co)
             ORDER BY timestamp DESC LIMIT 1
        ),
        prev AS (
            SELECT close AS prev_close
              FROM stock_data
             WHERE company_id = (SELECT id FROM this_co)
             ORDER BY timestamp DESC OFFSET 1 LIMIT 1
        ),
        agg AS (
            SELECT MIN(timestamp) AS first_update,
                   MAX(high) AS hi_all, MIN(low) AS lo_all,
                   COUNT(*) AS bar_count
              FROM stock_data
             WHERE company_id = (SELECT id FROM this_co)
        ),
        last52 AS (
            SELECT MAX(high) AS hi_52w, MIN(low) AS lo_52w
              FROM stock_data
             WHERE company_id = (SELECT id FROM this_co)
               AND timestamp >= (SELECT last_update FROM latest) - interval '365 days'
        ),
        latest_meta AS (
            SELECT market_cap, pe_ratio, dividend_yield, employees, metadata_updated_at
              FROM company_metadata
             WHERE company_id = (SELECT id FROM this_co)
             ORDER BY metadata_updated_at DESC LIMIT 1
        )
        SELECT
            c.id, c.symbol, c.name, c.exchange, c.country, c.state, c.city,
            sec.name AS sector, ind.name AS industry,
            c.sector_id, c.industry_id, c.metadata_updated_at,
            latest.last_update, agg.first_update, agg.bar_count,
            latest.last_price, latest.last_volume AS volume,
            agg.hi_all AS high_all, agg.lo_all AS low_all,
            last52.hi_52w, last52.lo_52w,
            prev.prev_close,
            CASE WHEN prev.prev_close IS NULL OR prev.prev_close = 0 THEN NULL
                 ELSE (latest.last_price - prev.prev_close) / prev.prev_close * 100
            END AS day_change_pct,
            lm.market_cap, lm.pe_ratio, lm.dividend_yield, lm.employees
        FROM companies c
        LEFT JOIN sectors    sec ON sec.id = c.sector_id
        LEFT JOIN industries ind ON ind.id = c.industry_id
        LEFT JOIN latest      ON true
        LEFT JOIN prev        ON true
        LEFT JOIN agg         ON true
        LEFT JOIN last52      ON true
        LEFT JOIN latest_meta lm ON true
        WHERE c.symbol = :symbol
    """), {"symbol": sym}).fetchone()
    return dict(row._mapping) if row else None


# ---------------------------------------------------------------------------
# History (range-bounded OHLCV)
# ---------------------------------------------------------------------------

def get_stock_history(db, symbol: str, start: Optional[str] = None, end: Optional[str] = None):
    sym = symbol.upper().strip()
    where = ["c.symbol = :symbol"]
    params: dict = {"symbol": sym}
    if start:
        where.append("timestamp >= :start")
        params["start"] = start
    if end:
        where.append("timestamp <= :end")
        params["end"] = end
    sql = f"""
        SELECT timestamp, open, high, low, close, volume, trade_count, vwap
        FROM stock_data s
        JOIN companies  c ON c.id = s.company_id
        WHERE {' AND '.join(where)}
        ORDER BY timestamp
    """
    return [dict(row._mapping) for row in db.execute(text(sql), params)]


# ---------------------------------------------------------------------------
# Filter dropdowns
# ---------------------------------------------------------------------------

def list_sectors(db):
    return [dict(r._mapping) for r in db.execute(text("""
        SELECT s.id, s.name, COUNT(c.id) AS company_count
        FROM sectors s LEFT JOIN companies c ON c.sector_id = s.id
        GROUP BY s.id, s.name ORDER BY s.name
    """))]


def list_industries(db, sector_id: Optional[int] = None):
    where = "WHERE c.sector_id = :sector_id" if sector_id is not None else ""
    params = {"sector_id": sector_id} if sector_id is not None else {}
    return [dict(r._mapping) for r in db.execute(text(f"""
        SELECT i.id, i.name, COUNT(c.id) AS company_count
        FROM industries i
        LEFT JOIN companies c ON c.industry_id = i.id {where}
        GROUP BY i.id, i.name ORDER BY i.name
    """), params)]
