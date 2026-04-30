from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.services import stock_service

router = APIRouter()


@router.get("/")
def get_stocks(
    sector_id:   Optional[int] = None,
    industry_id: Optional[int] = None,
    search:      Optional[str] = None,
    limit:       int = 10000,
    db: Session = Depends(get_db),
):
    return stock_service.list_stocks(
        db, sector_id=sector_id, industry_id=industry_id,
        search=search, limit=limit,
    )


@router.get("/sectors")
def get_sectors(db: Session = Depends(get_db)):
    return stock_service.list_sectors(db)


@router.get("/industries")
def get_industries(sector_id: Optional[int] = None, db: Session = Depends(get_db)):
    return stock_service.list_industries(db, sector_id=sector_id)


@router.get("/{symbol}/profile")
def stock_profile(symbol: str, db: Session = Depends(get_db)):
    profile = stock_service.get_stock_profile(db, symbol)
    if not profile:
        raise HTTPException(404, f"Symbol {symbol!r} not found")
    return profile


@router.get("/{symbol}/history")
def stock_history(
    symbol: str,
    start: Optional[str] = None,
    end:   Optional[str] = None,
    db: Session = Depends(get_db),
):
    return stock_service.get_stock_history(db, symbol, start, end)
