"""
A single Redis connection and a default queue, for callers that just
want one queue without the high/default/low setup in queue.py.
"""

import os

import redis
from rq import Queue

redis_conn = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=False,  # RQ needs raw bytes
)

task_queue = Queue("default", connection=redis_conn)
