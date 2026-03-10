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