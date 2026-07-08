"""
Starts an RQ worker that pulls from the high → default → low queues.

The @tracked decorator on each handler handles status updates, so this
file stays small. Runs as `python workers/worker.py` inside the worker
container.
"""

import os
import sys

from rq import Queue, Worker

# Make `app.*` importable when run as `python workers/worker.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.infrastructure.queue import redis_conn  # noqa: E402

QUEUE_NAMES = ["high", "default", "low"]


def main() -> None:
    # RQ 1.13+ dropped the Connection context manager — pass the connection straight to Queue/Worker.
    queues = [Queue(name, connection=redis_conn) for name in QUEUE_NAMES]
    worker = Worker(queues, connection=redis_conn)
    print(f"RQ worker listening on: {QUEUE_NAMES}", flush=True)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
