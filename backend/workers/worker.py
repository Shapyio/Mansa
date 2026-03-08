import redis
from rq import Worker, Queue

redis_conn = redis.Redis(host="redis", port=6379)

queue = Queue(connection=redis_conn)

worker = Worker([queue], connection=redis_conn)

if __name__ == "__main__":
    worker.work()