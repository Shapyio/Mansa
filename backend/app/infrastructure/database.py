"""
SQLAlchemy engine + session factory.

Picks DATABASE_URL if set (docker-compose does this), otherwise builds
the URL from the POSTGRES_* env vars. We raise if there's no password
rather than silently falling back to a default — that used to hide
misconfiguration.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def _build_database_url() -> str:
    explicit = os.getenv("DATABASE_URL")
    if explicit:
        return explicit

    user = os.getenv("POSTGRES_USER", "postgres")
    pw   = os.getenv("POSTGRES_PASSWORD")
    host = os.getenv("POSTGRES_HOST", "db")
    port = os.getenv("POSTGRES_PORT", "5432")
    db   = os.getenv("POSTGRES_DB", "stockdb")

    if not pw:
        raise RuntimeError(
            "Database password not configured. Set DATABASE_URL or POSTGRES_PASSWORD "
            "(see secrets.env)."
        )
    return f"postgresql://{user}:{pw}@{host}:{port}/{db}"


DATABASE_URL = _build_database_url()
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
