from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import stocks
from app.api.routes import models
from app.api.routes import jobs

app = FastAPI(title="Mansa API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
app.include_router(models.router, prefix="/models", tags=["models"])
# app.include_router(jobs.router, prefix="/jobs", tags=["jobs"]) No jobs available, so all jobs api commented out