# Example service, models not yet implemented
from sqlalchemy import text

def list_models(db):

    query = text("""
        SELECT
            model_id,
            accuracy,
            created_at
        FROM models
        ORDER BY created_at DESC
    """)

    result = db.execute(query)

    return [dict(row._mapping) for row in result]