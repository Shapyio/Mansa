import os
from redis import Redis
from rq import Queue

redis_conn = Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=False,   # RQ requires bytes
)

# Separate queues let you prioritize — high runs before default
queues = {
    "high":    Queue("high",    connection=redis_conn),
    "default": Queue("default", connection=redis_conn),
    "low":     Queue("low",     connection=redis_conn),
}

def get_queue(priority: int) -> Queue:
    """Map numeric priority (1-10) to a named RQ queue."""
    if priority <= 3:
        return queues["high"]
    elif priority <= 6:
        return queues["default"]
    else:
        return queues["low"]