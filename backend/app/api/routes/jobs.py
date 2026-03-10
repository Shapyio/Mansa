# from redis import Redis
# from rq import Queue

# from jobs.train_model import train_model
# from jobs.compute_features import compute_features

# redis_conn = Redis(host="redis", port=6379)
# queue = Queue(connection=redis_conn)


# TOOLS = {
#     "train_model": train_model,
#     "compute_features": compute_features
# }


# def submit_job(tool_name, params):

#     job = queue.enqueue(
#         TOOLS[tool_name],
#         **params
#     )

#     return {
#         "job_id": job.id
#     }