# MANSA
## Stock Prediction and Market Intelligence Platform

MANSA is a containerized, modular platform for financial data ingestion, feature engineering, machine learning experimentation, and predictive analytics for equities markets.

The system is designed as a scalable research and production environment for quantitative finance workflows. It supports automated data ingestion, feature pipelines, model training, batch inference, and interactive monitoring through a web dashboard.

The architecture emphasizes reproducibility, modularity, and extensibility to support future expansion into advanced AI systems capable of autonomous market analysis.

## System Architecture

The platform is composed of multiple services orchestrated through Docker.

| Service | Purpose |
| :--- | :--- |
| API | FastAPI service providing REST endpoints for data, models, and jobs |
| Worker | Background worker executing asynchronous jobs |
| Frontend | React dashboard for monitoring and control |
| Database | TimescaleDB time-series database for market data |
| Redis | Queue backend for asynchronous job processing |

The system architecture allows separation of:

- Data ingestion
- Feature computation
- Model training
- Prediction pipelines
- Dashboard visualization

This separation prevents long-running tasks from blocking API requests and allows horizontal scaling later.

## Core Technologies

- Backend API: FastAPI
- Frontend: React with Vite
- Database: TimescaleDB
- Queue System: RQ
- Cache / Queue Broker: Redis

Planned ML infrastructure:
- Experiment tracking: MLflow
- Workflow orchestration: Apache Airflow

## Project Goals

The long-term goal is to build a full-featured financial AI system capable of:

- Predicting price movement
- Predicting volatility
- Generating trading signals
- Performing sentiment analysis on financial news
- Incorporating macroeconomic signals
- Running ensembles of multiple models
- Supporting automated decision assistance

The system will evolve into an **AI-assisted quantitative research platform**.

## Project Phases
### Phase 1 — Core Infrastructure
#### Objectives:
- Containerized development environment
- TimescaleDB time-series storage
- Market data ingestion pipeline
- Feature computation framework
- React monitoring dashboard

#### Deliverables:
- 5-minute market data storage
- API endpoints for querying data
- Worker system for asynchronous jobs
- Dashboard widgets for system monitoring

### Phase 2 — Feature Store
#### Objectives:
- Compute technical indicators
- Store derived features separately from raw data
- Enable dynamic dataset creation for training

Examples of features:
- RSI
- MACD
- Volatility metrics
- Moving averages
- Market-relative strength

This stage creates the foundation for reliable machine learning workflows.

### Phase 3 — Model Training System
#### Objectives:
- Dynamic dataset builder
- Experiment tracking
- Model versioning
- Hyperparameter tuning

Models will be exported to ONNX format for standardized inference.

Potential models include:
- Gradient boosting
- Recurrent neural networks
- Transformers
- Reinforcement learning agents
- Ensemble models

### Phase 4 — Prediction Engine
#### Objectives:
- Real-time predictions
- Batch inference across all tracked assets
- Prediction persistence in database

The system will support predictions such as:
- short-term price movement
- volatility forecasts
- daily market outlook

### Phase 5 — AI Research Agent
#### Future goal:
Create an AI system capable of interacting with the platform's tools and datasets to conduct its own market analysis.

Potential capabilities include:
- querying financial data
- evaluating model outputs
- analyzing news sentiment
- generating market forecasts

## Directory Structure

Recommended project layout:
```
MANSA
│
├── .devcontainer
│   └── devcontainer.json
│
├── backend
│   │
|   ├── app                    # FastAPI application
|   │   ├── api                # API routes
|   │   │   ├── routes
|   │   │   │   ├── stocks.py
|   │   │   │   ├── models.py
|   │   │   │   └── jobs.py
|   │   │   └── main.py
|   │   │
|   │   ├── services           # API business logic
|   │   │   ├── stock_service.py
|   │   │   ├── model_service.py
|   │   │   └── job_service.py
|   │   │
|   │   └── dependencies.py
|   │
|   ├── core                   # Shared library (API + workers)
|   │   ├── config.py
|   │   ├── database.py
|   │   ├── logging.py
|   │   │
|   │   ├── ingestion
|   │   │   ├── company_ingestion.py
|   │   │   ├── price_ingestion.py
|   │   │   └── news_ingestion.py
|   │   │
|   │   ├── features
|   │   │   ├── indicators.py
|   │   │   └── feature_engineering.py
|   │   │
|   │   ├── models
|   │   │   ├── training.py
|   │   │   ├── prediction.py
|   │   │   └── evaluation.py
|   │   │
|   │   └── utils
|   │       └── helpers.py
|   │
|   ├── jobs                   # Worker job functions
|   │   ├── ingest_companies.py
|   │   ├── ingest_prices.py
|   │   ├── compute_features.py
|   │   ├── train_model.py
|   │   └── run_backtest.py
|   │
|   ├── workers                # Worker entrypoints
|   │   └── worker.py
|   │
|   ├── scripts                # DEV tools only (not used by containers)
|   │   ├── update_companies.py
|   │   ├── seed_db.py
|   │   └── debug_api.py
|   │
|   ├── requirements.txt
|   ├── Dockerfile
|   └── .dockerignore
│
├── frontend
│   │
│   ├── src
│   │   ├── components
│   │   │   ├── grid
│   │   │   ├── layout
│   │   │   └── widgets
│   │   │
│   │   ├── pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Models.tsx
│   │   │   ├── DataExplorer.tsx
│   │   │   └── Predictions.tsx
│   │   │
│   │   ├── services           # API clients
│   │   │   └── api.ts
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── Dockerfile
│   └── package.json
│
├── data
│   ├── import
│   └── init-timescaledb.sql
│
├── logs
│   ├── api
│   └── worker
│
├── docs
│   ├── architecture.md
│   └── system_design.md
│
├── docker-compose.yml
├── secrets.env
├── .gitignore
└── README.md
```

## Database Design

Primary storage is handled by TimescaleDB using hypertables.

Core tables include:
- `stocks`
- `features`
- `companies`
- `predictions`
- `models`
- `training_runs`

This design separates:
- raw data
- derived features
- model outputs
- experiment tracking

## API Design

The API exposes endpoints for:

Market Data
```
/market/prices
/market/features
```
Models
```
/models/train
/models/list
/models/info
```
Predictions
```
/predictions/latest
/predictions/top-gainers
```
Job Control
```
/jobs/ingest
/jobs/compute-features
/jobs/train-model
/jobs/predict
```
All long-running tasks are executed asynchronously through Redis queues.

## Docker Services

The platform runs five containers.

### API Service

FastAPI backend exposing REST endpoints.

### Worker
Processes background jobs such as:
- data ingestion
- feature generation
- model training
- prediction pipelines

### Frontend
React dashboard used for:
- monitoring system state
- visualizing data
- controlling pipelines

### Redis
- Provides queue infrastructure for background tasks.

### Database
- Stores time-series financial data and model outputs.

## Docker Compose
```yaml
services:

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mansa_api
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - ./backend:/app
      - ./logs/api:/app/logs
    env_file:
      - ./secrets.env
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/stockdb
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"

  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mansa_worker
    command: python worker.py
    volumes:
      - ./backend:/app
      - ./logs/worker:/app/logs
    env_file:
      - ./secrets.env
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/stockdb
      - REDIS_HOST=redis
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mansa_frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    depends_on:
      - api

  redis:
    image: redis:7
    container_name: mansa_redis
    ports:
      - "6379:6379"

  db:
    image: timescale/timescaledb:latest-pg15
    container_name: mansa_db
    environment:
      POSTGRES_DB: stockdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./data/init-timescaledb.sql:/docker-entrypoint-initdb.d/init-timescaledb.sql
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## Building and Running the System

Start the full system from the project root:
```
docker compose up --build
```
Services will be available at:
API
```
http://localhost:8000
```
Frontend
```
http://localhost:5173
```
Database
```
localhost:5432
```
Redis
```
localhost:6379
```

## API Keys and External Services

The platform requires API credentials for financial data providers.

Current integrations:

- [Alpaca Markets API](https://alpaca.markets/)
- [Financial Modeling Prep API](https://site.financialmodelingprep.com/)

Credentials must be placed in `secrets.env`.

Example configuration:
```
ALPACA_API_KEY=your_key
ALPACA_SECRET_KEY=your_secret

FMP_API_KEY=your_key
```

These credentials are loaded by the API and worker containers.

## Future Integrations

Planned external services include:
- Financial news providers
- Social media sentiment analysis
- Macroeconomic data APIs
- Weather data APIs for commodity-sensitive assets

## Development Notes

Wished improvements for future development:
- CI/CD pipelines
- Automated testing
- ML experiment tracking
- Dataset versioning
- Feature store management
- Distributed worker scaling

## Contact
Email: sagievg@gmail.com

LinkedIn: [LinkedIn](https://www.linkedin.com/in/shapiy-sagiev/)
