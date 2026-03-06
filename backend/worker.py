import os
import redis
from rq import Worker, Queue

listen = ["default"]

redis_conn = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=6379
)

if __name__ == "__main__":
    worker = Worker([Queue(name, connection=redis_conn) for name in listen])
    worker.work()