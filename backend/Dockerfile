FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy core + app + jobs + worker
COPY core/ ./core
COPY app/ ./app
COPY jobs/ ./jobs
COPY worker/ ./worker

ENV PYTHONUNBUFFERED=1

EXPOSE 8000