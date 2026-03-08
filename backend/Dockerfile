FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create logs dir
RUN mkdir -p /app/logs

# Copy backend code
COPY app/ ./app
COPY core/ ./core
COPY jobs/ ./jobs
COPY workers/ ./workers

ENV PYTHONUNBUFFERED=1

EXPOSE 8000