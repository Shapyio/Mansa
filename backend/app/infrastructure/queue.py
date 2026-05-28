import os
from redis import Redis
from rq import Queue

redis_conn = Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=False,   # RQ needs raw bytes
)

# Three queues so we can run urgent stuff before bulk work.
queues = {
    "high":    Queue("high",    connection=redis_conn),
    "default": Queue("default", connection=redis_conn),
    "low":     Queue("low",     connection=redis_conn),
}

def get_queue(priority: int) -> Queue:
    """Map a 1–10 priority to one of the three queues."""
    if priority <= 3:
        return queues["high"]
    elif priority <= 6:
        return queues["default"]
    else:
        return queues["low"]