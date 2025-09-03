FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install build essentials and Python tooling
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpq-dev \
    g++ \
    git \
    curl \
    wget \
    pkg-config \
    python3 \
    python3-pip \
    python3-venv \
    && apt-get clean

# Optional: create a python3 alias to just 'python'
RUN ln -s /usr/bin/python3 /usr/bin/python || true

# Create a virtual environment and install requirements
COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r /tmp/requirements.txt

# Set environment for using the venv by default
ENV PATH="/opt/venv/bin:$PATH"

# TODO: For connecting to Postgres in C++: later add libpqxx or similar

WORKDIR /app
