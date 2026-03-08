from sqlalchemy import text


def list_stocks(db):

    query = text("""
        SELECT
            c.symbol,
            MAX(s.timestamp) AS last_update,
            LAST(s.close, s.timestamp) AS last_price
        FROM stock_data s
        JOIN companies c
        ON c.id = s.company_id
        GROUP BY c.symbol
        ORDER BY c.symbol
    """)

    result = db.execute(query)

    return [dict(row._mapping) for row in result]


def get_stock_history(db, symbol, start, end):

    query = text("""
        SELECT
            timestamp,
            open,
            high,
            low,
            close,
            volume
        FROM stock_data s
        JOIN companies c
        ON c.id = s.company_id
        WHERE c.symbol = :symbol
        AND timestamp BETWEEN :start AND :end
        ORDER BY timestamp
    """)

    result = db.execute(
        query,
        {"symbol": symbol, "start": start, "end": end}
    )

    return [dict(row._mapping) for row in result]