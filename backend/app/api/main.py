from fastapi import FastAPI

from app.api.routes import stocks
from app.api.routes import models
from app.api.routes import jobs

app = FastAPI(title="Stock ML API")

app.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
app.include_router(models.router, prefix="/models", tags=["models"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])