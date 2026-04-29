"""
RQ worker entrypoint.

Processes jobs from the high -> default -> low queues in priority order.
Lifecycle bookkeeping (running/done/failed/paused timestamps) is handled by
the @tracked decorator in app.jobs._audit, so this file stays thin.

Run inside the worker container:
    python workers/worker.py
"""

import os
import sys

from rq import Queue, Worker

# Make `app.*` importable when run as `python workers/worker.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infrastructure.queue import redis_conn  # noqa: E402

QUEUE_NAMES = ["high", "default", "low"]


def main() -> None:
    # `rq.Connection` was removed in RQ 1.13+; pass the connection directly
    # to Queue/Worker instead of using the deprecated context manager.
    queues = [Queue(name, connection=redis_conn) for name in QUEUE_NAMES]
    worker = Worker(queues, connection=redis_conn)
    print(f"RQ worker listening on: {QUEUE_NAMES}", flush=True)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
