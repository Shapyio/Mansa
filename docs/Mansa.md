# Mansa: Stock Prediction and Analysis Platform

## 1. Overview

Mansa is a work-in-progress, multi-language, machine learning-powered platform that aims to predict and analyze stock market movements. It seeks to leverage structured and unstructured data sources—including stock prices, financial indicators, news articles, and weather reports—to provide actionable insights to users.

Initially, the system is implemented in Python for rapid development and testing, with performance-critical components (such as model inference) planned for C++ implementations. Docker is used for containerization, and CI/CD pipelines are envisioned using GitHub Actions and/or JIRA-GitHub integrations. The entire lifecycle of the system follows a semi-formal SDLC approach for future maintainability and scalability.

---

## 2. Problem Statement

Current stock prediction tools and platforms are often either too simple to be reliable or too opaque in their decision-making processes. Many individual investors lack access to tools that integrate real-time financial data, sentiment from news sources, and advanced ML models into a cohesive and customizable platform.

---

## 3. Proposed Solution

Mansa aims to provide a modular, extensible, and high-performance stock prediction platform. The tool will:

* Aggregate financial data from multiple APIs 
* Store and manage data in a performant, queryable database
* Run data preprocessing pipelines and feature extraction in Python
* Use multiple ML models (in Python/C++) to analyze different modalities (numerical, textual, environmental)
* Visualize predictions and analytics through an interface (planned future feature)
* Include options and cryptocurrency support in future extensions

---

## 4. Existing Products on the Market

| Product Name      					| Pros                                            			   | Cons                                                      			      |
| ----------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **Yahoo Finance** [[1](https://finance.yahoo.com/)] 	| Easy access to data, comprehensive charts, and news           	   | No predictive capabilities, limited ML integration, some features behind paywall |
| **TradingView** [[2](https://www.tradingview.com/)]  	| Custom scripting (Pine Script), good visual analysis, comprehensive data | No ML, expensive premium plans, a lot of features behind paywall                 |
| **QuantConnect** [[3](https://www.quantconnect.com/)]	| Supports backtesting, ML, algorithmic trading   			   | Steep learning curve, limited custom pipeline integration, limited free featues  |
| **Kavout** [[4](https://www.kavout.com/)]         	| ML-based predictive scores (K-scores)           			   | Closed-source, no extensibility, limited access to AI tools with free plan       |
| **Finbrain** [[5](https://finbrain.tech/)]      	| Incorporates sentiment and ML                   			   | Limited transparency, costly                              			      |

---

## 5. Mansa Architecture Overview

### Components Breakdown

* **Data Importing/API Layer**

  * API clients for stock, news, weather (Alpaca, NewsAPI, etc.)
* **Database Layer**

  * Chosen based on performance, flexibility, time-series support
* **Data Preprocessing Module**

  * Data cleaning, normalization, feature engineering (Python)
* **Modeling Layer**

  * Ensemble of ML models in Python/C++
* **Interface (Planned)**

  * CLI initially; Website (React) and desktop app (Electron or PyQt) planned
* **Deployment Pipeline**

  * CMake (build), Docker (container), CI/CD (GitHub Actions, JIRA)

---

## 6. Requirements Table

| Requirement ID | Description                                | Priority | Status         |
| -------------- | ------------------------------------------ | -------- | -------------- |
| R1             | Import historical stock data               | High     | In progress    |
| R2             | Store time-series data                     | High     | Research Phase |
| R3             | Preprocess raw data                        | High     | Not started    |
| R4             | Train and evaluate ML models               | High     | Not started    |
| R5             | Aggregate news headlines                   | Medium   | Not started    |
| R6             | Dockerized deployment                      | Medium   | In progress    |
| R7             | Fetch real-time stock and quote data       | High     | Not started    |
| R8             | Store and analyze weather data             | Medium   | Research phase |
| R9             | UI/UX for website                	      | Low 	 | Planned        |
| R10            | UI/UX for desktop app            	      | Low	 | Planned        |
| R11            | Fetch and preprocess weather and news data | Medium   | Research phase |

---

## 7. Limitations Table

| Limitation                | Description                                                      |
| ------------------------- | ---------------------------------------------------------------- |
| Language Interoperability | Python and C++ communication may require bridges (e.g. pybind11) |
| Real-time Prediction      | Hard to guarantee due to API latency and model speed             |
| Data Licensing            | Some data sources may be paid or restrictive                     |
| News Reliability          | Sentiment analysis depends heavily on context                    |
| API Call Limits           | APIs only allow certain number of calls before limits	       |
| MVP Scope                 | Focus on historical and live stock data only initially           |

---

## 8. Risks Table

| Risk ID | Risk Description                                          | Potential Impact                                 | Mitigation Strategy                                                            |
| ------- | --------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| RSK1    | Too many API calls slowing model or exceeding rate limits | Model delay or blocked access to data            | Implement rate limiting, batch requests, and caching of frequent queries       |
| RSK2    | Unexpected costs from premium APIs or data services       | Budget overruns or need to halt services         | Compare cost-benefit in selection, prioritize free or affordable alternatives  |
| RSK3    | Integration complexity between Python and C++             | Development delays, bugs, deployment complexity  | Use pybind11 or gRPC, modularize C++ segments clearly                          |
| RSK4    | CI/CD pipeline failure due to configuration issues        | Slowed dev velocity or broken builds             | Automate testing on Docker images; test GitHub/JIRA linking in a sandbox first |
| RSK5    | News data inconsistent or biased                          | Reduced model accuracy                           | Use multiple APIs, normalize data, train sentiment model with diverse corpus   |
| RSK6    | Inadequate hardware for training models                   | Long training times, experimentation bottlenecks | Leverage cloud GPUs, use mixed-precision training, optimize data pipelines     |
| RSK7    | DB schema or structure limitations                        | Inflexible data storage or slow queries          | Use scalable schema, benchmark with sample data sets                           |
| RSK8    | Lack of UI/UX experience causing slow progress            | Poor adoption or feedback from demo users        | Use open-source templates, build UI iteratively based on feedback              |
| RSK9    | Feature creep or over-scoping MVP                         | Missed deadlines, burnout                        | Maintain strict MVP boundary, backlog non-MVP features (e.g., options, crypto) |
| RSK10   | Legal issues around data scraping or API TOS violations   | Service bans, legal threats                      | Stick to licensed APIs, document all API usage and terms                       |
| RSK11   | Incomplete or corrupted financial datasets                | Model training errors                            | Validate all data on ingestion, log and skip corrupt entries                   |
| RSK12   | Poor test coverage                                        | Hard to track regressions or bugs                | Write tests for each core module and endpoint; automate with CI/CD             |

---

## 9. Test Requirements for MVP

| Test Case ID | Description                          | Acceptance Criteria                                |
| ------------ | ------------------------------------ | -------------------------------------------------- |
| TC1          | Stock data fetcher works with API    | Data is fetched and parsed with no errors          |
| TC2          | Data stored in DB is queryable       | Query by ticker/date returns correct rows          |
| TC3          | Preprocessing handles missing data   | No NULLs or NaNs passed to model                   |
| TC4          | Basic model can predict trend        | Accuracy > 50% on test split                       |
| TC5          | Docker image builds successfully     | Container runs with all services up                |
| TC6          | Model prediction time                | Predictions returned in under 1 minute per request |
| TC7          | Time horizon forecasts               | Model produces outputs for hours, days, weeks, and years  |

---

## 10. Design Choices

### 10.1 SDLC Style

**Chosen:** Kanban
**Rationale:** Lightweight structure suitable for solo development and iterative updates.
**Alternatives Considered:**

* **Scrum** – Too rigid for solo workflow
* **Waterfall** – Not flexible enough for experimentation

---

### 10.2 Model Selection

| Model Type    | Best For                              | Pros                                           | Cons                                      |
| ------------- | ------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| LSTM/GRU      | Time-series price prediction          | Captures temporal dependencies                 | Needs lots of data, slower training       |
| XGBoost       | Tabular data with engineered features | Fast, interpretable, handles missing data well | Requires feature engineering              |
| Random Forest | Baseline tabular prediction           | Simple, ensemble power                         | Less effective for long-term forecasting  |
| FinBERT       | Sentiment analysis on financial text  | Financial-domain-tuned language model          | Needs text preprocessing, large           |
| ARIMA/SARIMA  | Classic forecasting                   | Interpretable, no training required            | Doesn’t scale well with multivariate data |

**Decision:** Use a hybrid ensemble of LSTM (time-series), XGBoost (numeric indicators), and FinBERT (text).

---

### 10.3 Database Options

| Database    | Strengths                                 | Weaknesses                        |
| ----------- | ----------------------------------------- | --------------------------------- |
| TimescaleDB | Optimized for time-series, SQL compatible | Requires PostgreSQL knowledge     |
| MongoDB     | Schema-less for flexible documents        | Less ideal for time-based queries |
| SQLite      | Lightweight, good for local testing       | Not scalable for production       |

**Chosen:** TimescaleDB for stock/bar/trade data; MongoDB optional for news.

---

### 10.4 Stock API Comparison

| API           | Data Types Available        | Cost      | Real-time? | Notes           |
| ------------- | --------------------------- | --------- | ---------- | --------------- |
| Alpaca        | Trade, Quote, LULD, Bars    | Free/Paid | Yes        | ✅ Chosen       |
| IEX Cloud     | Quotes, fundamentals, stats | Paid      | Yes        | Good backup     |
| Yahoo Finance | Historical, fundamentals    | Free      | No         | No official API |

---

### 10.5 News API Comparison

| API             | Pros                                  | Cons             | Notes                |
| --------------- | ------------------------------------- | ---------------- | -------------------- |
| Alpaca News API | Native, integrated with stock symbols | Limited scope    | ✅ Primary news API  |
| NewsAPI.org     | Large source pool, easy to use        | Rate-limited     | Used for comparison  |
| GNews           | Financial and general articles        | Smaller coverage | Optional backup      |
| ContextualWeb   | NLP filters, metadata tags            | Smaller database | For future sentiment |

---

### 10.6 Data Format (Alpaca)

Alpaca’s full data schema for real-time stock includes:

* **Trades**: `price`, `size`, `timestamp`, `conditions`, etc.
* **Quotes**: `ask_price`, `bid_price`, `ask_size`, `bid_size`
* **Bars**: `open`, `high`, `low`, `close`, `volume`, `timestamp`
* **LULD**: `limit_up`, `limit_down`, `timestamp`

Along with other data schemas for more niche stock calls as well as options and crypto data schemas. 

**Decision:** All available fields will be stored per record type to allow flexible feature exploration and future-proofing. Use schemas to validate on ingestion.

---

## 11. References

* [Alpaca Real-Time Pricing Data](https://docs.alpaca.markets/docs/real-time-stock-pricing-data)
* [TimescaleDB Documentation](https://www.timescale.com/)
* [NewsAPI](https://newsapi.org/)
* [GNews API](https://gnews.io/)
* [FinBERT Paper & GitHub](https://github.com/yya518/FinBERT)
* [QuantConnect Platform](https://www.quantconnect.com/)
* [LSTM vs GRU Research](https://arxiv.org/abs/1409.2329)

---

## 12. License & Attribution

Mansa is currently a private project. All third-party libraries and APIs used are under their respective licenses. This document is not affiliated with Alpaca or any other service providers.

---

## 13. Appendix

This section will hold:

* Architecture diagrams (system flow, model pipeline)
* Model formulas (e.g., LSTM cell, XGBoost loss function)
* Future test plans and benchmark results
* SDLC artifacts like the Kanban board or CI/CD config

---
