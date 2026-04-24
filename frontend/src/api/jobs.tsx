export async function runJob(tool: string, params: any) {
  const res = await fetch(`/api/jobs/${tool}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    throw new Error("Job failed");
  }

  return res.json();
}

export async function getJobStatus() {
  const res = await fetch("/api/jobs/status");
  if (!res.ok) throw new Error("Failed to fetch job status");
  return res.json();
}

export async function checkDataGaps() {
  const res = await fetch("/api/jobs/gaps");
  if (!res.ok) throw new Error("Failed to check data gaps");
  return res.json();
}

export async function enqueueGaps(gaps: any[]) {
  const res = await fetch("/api/jobs/gaps/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gaps }),
  });
  if (!res.ok) throw new Error("Failed to enqueue gaps");
  return res.json();
}

export async function checkStaleMetadata() {
  const res = await fetch("/api/jobs/metadata/stale");
  if (!res.ok) throw new Error("Failed to check stale metadata");
  return res.json();
}

export async function enqueueMetadataUpdates(company_ids: number[]) {
  const res = await fetch("/api/jobs/metadata/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_ids }),
  });
  if (!res.ok) throw new Error("Failed to enqueue metadata updates");
  return res.json();
}

export async function retryFailedJobs() {
  const res = await fetch("/api/jobs/retry-failed", { method: "POST" });
  if (!res.ok) throw new Error("Failed to retry failed jobs");
  return res.json();
}