import { useState } from "react";
import Widget from "../grid/Widget";
import {
  runJob,
  getJobStatus,
  checkDataGaps,
  enqueueGaps,
  checkStaleMetadata,
  enqueueMetadataUpdates,
  retryFailedJobs,
} from "../../api/jobs";

type GapResult    = { count: number; gaps: any[] };
type MetaResult   = { count: number; companies: any[] };
type StatusResult = { counts: Record<string, number>; recent: any[] };

export default function ToolsWidget() {
  const [loading,     setLoading]     = useState<string | null>(null);
  const [gapPreview,  setGapPreview]  = useState<GapResult | null>(null);
  const [metaPreview, setMetaPreview] = useState<MetaResult | null>(null);
  const [jobStatus,   setJobStatus]   = useState<StatusResult | null>(null);
  const [message,     setMessage]     = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(`Error: ${(e as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleTrainModel = () =>
    run("train", async () => {
      const res = await runJob("train_model", { symbol: "AAPL" });
      setMessage(`Job queued: #${res.job_id}`);
    });

  const handleComputeFeatures = () =>
    run("features", async () => {
      const res = await runJob("compute_features", {});
      setMessage(`Features job queued: #${res.job_id}`);
    });

  const handleCheckGaps = () =>
    run("gaps", async () => {
      const res = await checkDataGaps();
      setGapPreview(res);
      setMetaPreview(null);
      setJobStatus(null);
    });

  const handleEnqueueAllGaps = () =>
    run("enqueue-gaps", async () => {
      if (!gapPreview) return;
      const res = await enqueueGaps(gapPreview.gaps);
      setMessage(`Enqueued ${res.enqueued} gap-fill jobs`);
      setGapPreview(null);
    });

  const handleCheckMetadata = () =>
    run("metadata", async () => {
      const res = await checkStaleMetadata();
      setMetaPreview(res);
      setGapPreview(null);
      setJobStatus(null);
    });

  const handleEnqueueMetadata = () =>
    run("enqueue-meta", async () => {
      if (!metaPreview) return;
      const ids = metaPreview.companies.map((c: any) => c.id);
      const res = await enqueueMetadataUpdates(ids);
      setMessage(`Enqueued ${res.enqueued} metadata update jobs`);
      setMetaPreview(null);
    });

  const handleJobStatus = () =>
    run("status", async () => {
      const res = await getJobStatus();
      setJobStatus(res);
      setGapPreview(null);
      setMetaPreview(null);
    });

  const handleRetryFailed = () =>
    run("retry", async () => {
      const res = await retryFailedJobs();
      setMessage(`Retried ${res.retried} failed jobs`);
      if (jobStatus) {
        const updated = await getJobStatus();
        setJobStatus(updated);
      }
    });

  const isLoading = (label: string) => loading === label;

  return (
    <Widget>
      <Widget.Header>
        <span>Tools</span>
        <Widget.Controls>
          <button onClick={handleJobStatus} disabled={!!loading}>
            {isLoading("status") ? "..." : "Queue Status"}
          </button>
        </Widget.Controls>
      </Widget.Header>

      <Widget.Content>

        {/* ── Model ── */}
        <section>
          <h4>Model</h4>
          <button onClick={handleTrainModel}      disabled={!!loading}>
            {isLoading("train")    ? "Training..."  : "Train Model"}
          </button>
          <button onClick={handleComputeFeatures} disabled={!!loading}>
            {isLoading("features") ? "Computing..." : "Compute Features"}
          </button>
        </section>

        {/* ── Data ── */}
        <section>
          <h4>Data</h4>
          <button onClick={handleCheckGaps}     disabled={!!loading}>
            {isLoading("gaps")     ? "Checking..."  : "Check Data Gaps"}
          </button>
          <button onClick={handleCheckMetadata} disabled={!!loading}>
            {isLoading("metadata") ? "Checking..."  : "Stale Metadata"}
          </button>
          <button onClick={handleRetryFailed}   disabled={!!loading}>
            {isLoading("retry")    ? "Retrying..."  : "Retry Failed Jobs"}
          </button>
        </section>

        {/* ── Feedback ── */}
        {message && <p style={{ color: "var(--color-accent)" }}>{message}</p>}

        {/* ── Gap Preview ── */}
        {gapPreview && (
          <div>
            <p>{gapPreview.count} gap(s) found</p>
            <ul style={{ maxHeight: 160, overflowY: "auto", fontSize: 12 }}>
              {gapPreview.gaps.map((g, i) => (
                <li key={i}>
                  <strong>{g.symbol}</strong>: {g.gap_start} → {g.gap_end} ({g.days_missing}d)
                </li>
              ))}
            </ul>
            {gapPreview.count > 0 && (
              <button onClick={handleEnqueueAllGaps} disabled={!!loading}>
                {isLoading("enqueue-gaps") ? "Queuing..." : `Enqueue All ${gapPreview.count} Gaps`}
              </button>
            )}
          </div>
        )}

        {/* ── Metadata Preview ── */}
        {metaPreview && (
          <div>
            <p>{metaPreview.count} company(ies) with stale/missing metadata</p>
            <ul style={{ maxHeight: 120, overflowY: "auto", fontSize: 12 }}>
              {metaPreview.companies.map((c: any) => (
                <li key={c.id}>{c.symbol} — last updated: {c.metadata_updated_at ?? "never"}</li>
              ))}
            </ul>
            {metaPreview.count > 0 && (
              <button onClick={handleEnqueueMetadata} disabled={!!loading}>
                {isLoading("enqueue-meta") ? "Queuing..." : `Update ${metaPreview.count} Companies`}
              </button>
            )}
          </div>
        )}

        {/* ── Job Queue Status ── */}
        {jobStatus && (
          <div>
            <h4>Postgres Audit</h4>
            <ul style={{ fontSize: 12 }}>
              {Object.entries(jobStatus.counts).map(([status, count]) => (
                <li key={status}><strong>{status}</strong>: {count as number}</li>
              ))}
            </ul>

            <h4>Redis Queues (live)</h4>
            <ul style={{ fontSize: 12 }}>
              {Object.entries(jobStatus.redis_queues ?? {}).map(([q, count]) => (
                <li key={q}><strong>{q}</strong>: {count as number} pending</li>
              ))}
            </ul>

            <h4>Recent Jobs</h4>
            <ul style={{ maxHeight: 140, overflowY: "auto", fontSize: 11 }}>
              {jobStatus.recent.map((j: any) => (
                <li key={j.id}>
                  #{j.id} [{j.status}] {j.job_type}
                  {j.error_msg && <span style={{ color: "red" }}> ⚠</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

      </Widget.Content>
    </Widget>
  );
}