"""
Alpaca client and a retry helper.

The client is built on first use, not at import — handlers run in a
forked worker process. A 429 from Alpaca raises TokenBudgetExceeded so
the job gets paused instead of failed.
"""

import logging
import os
import random
import time
from typing import Callable, TypeVar

from alpaca.common.exceptions import APIError
from alpaca.data.historical import StockHistoricalDataClient

from app.jobs._audit import TokenBudgetExceeded

log = logging.getLogger(__name__)

_client: StockHistoricalDataClient | None = None


def get_client() -> StockHistoricalDataClient:
    global _client
    if _client is None:
        key    = os.getenv("ALPACA_API_KEY")
        secret = os.getenv("ALPACA_SECRET_KEY")
        if not key or not secret:
            raise RuntimeError("ALPACA_API_KEY / ALPACA_SECRET_KEY not set")
        _client = StockHistoricalDataClient(api_key=key, secret_key=secret)
    return _client


T = TypeVar("T")


def call_with_retry(
    fn: Callable[[], T],
    *,
    max_attempts: int = 4,
    base_delay: float = 1.0,
) -> T:
    """Retry an Alpaca call with backoff.

    429 -> pause the job. 4xx -> give up (probably a bug in our request).
    5xx and network blips -> wait and try again.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            return fn()
        except APIError as e:
            status = getattr(e, "status_code", None)
            if status == 429:
                raise TokenBudgetExceeded(f"Alpaca rate-limited (429): {e}") from e
            if status is not None and 400 <= status < 500:
                raise
            if attempt == max_attempts:
                raise
            delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
            log.warning("Alpaca hiccup (status=%s), retry %d/%d in %.1fs: %s",
                        status, attempt, max_attempts, delay, e)
            time.sleep(delay)
        except Exception:
            if attempt == max_attempts:
                raise
            delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
            log.warning("Alpaca call failed, retry %d/%d in %.1fs",
                        attempt, max_attempts, delay, exc_info=True)
            time.sleep(delay)
    raise RuntimeError("unreachable")  # keep the type-checker happy
