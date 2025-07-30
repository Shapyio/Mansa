FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Install build essentials and CMake
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libpq-dev \
    g++ \
    git \
    curl \
    wget \
    pkg-config

# For connecting to Postgres in C++: later add libpqxx or similar

# Default work directory
WORKDIR /app
