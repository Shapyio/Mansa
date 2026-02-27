# Mansa: Stock Prediction AI

This project is a containerized, modular stock prediction and data analysis system designed for cross-platform development and deployment. The goal is to support prediction logic, web scraping, sentiment analysis, indicators, and API integration—all in a scalable pipeline.

## Getting Started
### ⚙️ How to Build and Run the Project
**NOTE:** Prerequisites are required to successfully run scripts. Namely, account(s) and API key(s) from Alpaca and Financial Modeling Prep are needed. See Prerequisites header below for more information.
1. Start the container

Run the following from your project root to spin up your dev environment:

``` bash
docker-compose up --build
```

2. Attach VSCode to the container

- Open the project in VSCode.
- You should be prompted to "Reopen in Container".
- If not, press `F1` and choose `Dev Containers: Reopen in Container`.

3. Build the project

From inside the container terminal or via VSCode terminal:

``` bash
cmake -S . -B build
cmake --build build
```

4. Run the project

``` bash 
./build/mansa
```

---

## 📅 Project Milestones

#### 🧠 Epic: Environment & Tooling Setup

- [x] Dev container setup with Docker & VSCode
- [ ] GitHub Actions for CI
- [ ] Cross-platform CMake build

#### 📊 Epic: Data Collection System

- [ ] Financial API integration (e.g., AlphaVantage, Yahoo Finance)
- [ ] Sentiment scraping (Reddit, news, Twitter)
- [ ] Data pre-processing and cleanup

#### 🧠 Epic: Prediction Engine

- [ ] Implement core logic (indicators, thresholds)
- [ ] Trainable ML model support (regression/classification)
- [ ] Evaluate and test predictions

#### 💻 Epic: Interface & Visualization

- [ ] Simple CLI or web UI to view predictions
- [ ] Plot historical vs predicted trends
- [ ] JSON API to fetch results

---

## 📁 Project Structure (Reference to follow)

```plaintext
Mansa/
├── .devcontainer/            # VSCode devcontainer configs
│   ├── Dockerfile            # Base image with C++/Python/DB tools
│   └── devcontainer.json     # Container setup and features
│
├── .vscode/                  # Editor settings (auto-format, linting)
│   └── settings.json
│
├── cmake/                    # Optional: reusable CMake modules
│   └── CustomModule.cmake    # E.g., Find dependencies, macros
│
├── src/                      # Application source code
│   ├── main.cpp              # Entry point
│   ├── ai/                   # ML/AI logic and models
│   ├── api/                  # API clients (financial/news)
│   ├── engine/               # Core engine logic (prediction, etc.)
│   └── utils/                # Utility functions
│
├── include/                  # Public header files
│   ├── ai.hpp
│   ├── engine.hpp
│   └── ...
│
├── test/                     # Unit and integration tests
│   ├── test_main.cpp
│   └── ai_test.cpp
│
├── scripts/                  # Dev/test/deploy scripts
│   ├── setup.sh              # Setup environment
│   ├── run_container.sh      # Run docker-compose containers
│   └── fetch_data.py         # Data gathering
│
├── data/                     # Local data storage (logs, raw data)
│   └── input.csv
│
├── docs/                     # Documentation (design, architecture)
│   ├── architecture.md
│   └── api_reference.md
│
├── docker-compose.yml        # Multi-container orchestration
├── CMakeLists.txt            # Top-level build script
├── .gitignore
└── README.md                 # This file
```

### 🛠️ CMake Notes

- Keep a top-level `CMakeLists.txt` to drive the build.
- Add `CMakeLists.txt` files to subdirectories (`src/`, `test/`) to build targets modularly.
- `cmake/` can contain custom modules or third-party config helpers.

### 🚢 Docker & Containerization

This project is containerized using a multi-container Docker Compose setup, including:

- `dev`: Development container with compilers, CMake, Python, and VSCode features
- `db`: Postgres database container for storing scraped or processed data

You can spin it up using:

```bash
docker-compose up --build
```

---

## ✍️ Personal Notes

My thoughts here:

- Research models for stock prediction, sentiment analysis, as well as more niche trackers (weather, patterns, etc)
- Explore integration with API for headlines and articles
- Keep notebook with ML experiment results
