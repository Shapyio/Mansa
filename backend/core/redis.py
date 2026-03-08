import redis
from rq import Queue

redis_conn = redis.Redis(host="redis", port=6379)

task_queue = Queue("default", connection=redis_conn)