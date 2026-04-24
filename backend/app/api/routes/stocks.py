from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.services import stock_service

router = APIRouter()


@router.get("/")
def get_stocks(db: Session = Depends(get_db)):
    return stock_service.list_stocks(db)


@router.get("/{symbol}/history")
def stock_history(
    symbol: str,
    start: str,
    end: str,
    db: Session = Depends(get_db)
):
    return stock_service.get_stock_history(
        db,
        symbol,
        start,
        end
    )