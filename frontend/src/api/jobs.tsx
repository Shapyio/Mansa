export type JobStatus = "pending" | "running" | "done" | "failed" | "paused";

export interface JobRow {
  id: number;
  job_type: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  priority: number;
  tags: string[];
  attempts: number;
  max_attempts: number;
  error_msg: string | null;
  rq_job_id: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  paused_at: string | null;
}

export interface JobStatusResponse {
  counts: Partial<Record<JobStatus, number>>;
  recent: JobRow[];
  redis_queues: Record<string, number>;
  tags: string[];
  job_types: string[];
}

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function getJobStatus(opts: { tags?: string[]; status?: JobStatus; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.status) params.set("status", opts.status);
  (opts.tags ?? []).forEach((t) => params.append("tag", t));
  const qs = params.toString();
  return jfetch<JobStatusResponse>(`/api/jobs/status${qs ? `?${qs}` : ""}`);
}

export const checkDataGaps = () =>
  jfetch<{ count: number; gaps: any[] }>("/api/jobs/gaps");

export const enqueueGaps = (gaps: any[]) =>
  jfetch<{ enqueued: number }>("/api/jobs/gaps/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gaps }),
  });

export const checkStaleMetadata = () =>
  jfetch<{ count: number; companies: any[] }>("/api/jobs/metadata/stale");

export const enqueueMetadataUpdates = (company_ids: number[]) =>
  jfetch<{ enqueued: number }>("/api/jobs/metadata/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_ids }),
  });

export const retryFailedJobs = () =>
  jfetch<{ retried: number }>("/api/jobs/retry-failed", { method: "POST" });

export const submitJob = (
  job_type: string,
  payload: Record<string, unknown> = {},
  opts: { priority?: number; tags?: string[] } = {},
) =>
  jfetch<{ pg_job_id: number; rq_job_id: string }>("/api/jobs/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_type, payload, priority: opts.priority ?? 5, tags: opts.tags }),
  });

export const pauseJob = (id: number) =>
  jfetch<{ paused: number }>(`/api/jobs/${id}/pause`, { method: "POST" });

export const resumeJob = (id: number) =>
  jfetch<{ pg_job_id: number; rq_job_id: string }>(`/api/jobs/${id}/resume`, { method: "POST" });

export const pauseAll = (reason = "global pause") =>
  jfetch<{ paused: number }>("/api/jobs/pause-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });

export const resumeAll = () =>
  jfetch<{ resumed: number }>("/api/jobs/resume-all", { method: "POST" });

export interface TickResult {
  metadata_budget: number;
  gap_budget: number;
  resumed: number;
  metadata_enqueued: number;
  gaps_enqueued: number;
}

export const runTick = (opts: { metadata_budget?: number; gap_budget?: number } = {}) =>
  jfetch<TickResult>("/api/jobs/tick", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
