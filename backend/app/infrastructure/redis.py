"""
Standalone Redis connection + a default RQ Queue, for callers that want a
quick-grab queue without touching the priority queue map in queue.py.

Most code should import from `queue.py` (which exposes high/default/low).
Both modules read the same env vars so they stay in sync.
"""

import os

import redis
from rq import Queue

redis_conn = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=False,  # RQ requires bytes
)

task_queue = Queue("default", connection=redis_conn)
