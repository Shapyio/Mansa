# Example service, models not yet implemented
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.infrastructure.database import get_db
from app.services import model_service

router = APIRouter()

@router.get("/")
def models(db: Session = Depends(get_db)):
    return model_service.list_models(db)