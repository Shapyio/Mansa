import { useEffect, useMemo, useState } from "react";

import PageHeader from "../components/layout/PageHeader";
import {
  type JobRow,
  type JobStatus,
  type JobStatusResponse,
  checkDataGaps,
  checkStaleMetadata,
  enqueueGaps,
  enqueueMetadataUpdates,
  getJobStatus,
  pauseAll,
  pauseJob,
  resumeAll,
  resumeJob,
  retryFailedJobs,
  submitJob,
} from "../api/jobs";

const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "#9aa0a6",
  running: "#1a73e8",
  done:    "#188038",
  failed:  "#d93025",
  paused:  "#f9ab00",
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

export default function Tools() {
  const [data, setData]         = useState<JobStatusResponse | null>(null);
  const [busy, setBusy]         = useState<string | null>(null);
  const [msg, setMsg]           = useState<string | null>(null);
  const [filterTags, setTags]   = useState<string[]>([]);
  const [filterStatus, setSt]   = useState<JobStatus | "">("");
  const [poll, setPoll]         = useState(true);

  const refresh = async () => {
    try {
      const res = await getJobStatus({
        tags:   filterTags.length ? filterTags : undefined,
        status: filterStatus || undefined,
        limit:  100,
      });
      setData(res);
    } catch (e) {
      setMsg(`Refresh failed: ${(e as Error).message}`);
    }
  };

  useEffect(() => { refresh(); /* on filter change */ }, [filterTags, filterStatus]);
  useEffect(() => {
    if (!poll) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [poll, filterTags, filterStatus]);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    setMsg(null);
    try {
      const out = await fn();
      if (out) setMsg(out);
      await refresh();
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  // --- quick actions -------------------------------------------------------
  const onTrainAAPL = () =>
    run("train", async () => {
      const r = await submitJob("train_model", { symbol: "AAPL" }, { tags: ["Manual"] });
      return `Queued train_model #${r.pg_job_id}`;
    });

  const onCheckGaps = () =>
    run("gaps", async () => {
      const r = await checkDataGaps();
      if (!r.count) return "No gaps found";
      const e = await enqueueGaps(r.gaps);
      return `Found ${r.count} gaps, enqueued ${e.enqueued}`;
    });

  const onCheckMeta = () =>
    run("meta", async () => {
      const r = await checkStaleMetadata();
      if (!r.count) return "No stale metadata";
      const e = await enqueueMetadataUpdates(r.companies.map((c: any) => c.id));
      return `${r.count} stale, enqueued ${e.enqueued}`;
    });

  const onRetry    = () => run("retry",    async () => `Retried ${(await retryFailedJobs()).retried}`);
  const onPauseAll = () => run("pauseAll", async () => `Paused ${(await pauseAll()).paused}`);
  const onResumeAll= () => run("resumeAll",async () => `Resumed ${(await resumeAll()).resumed}`);

  const counts = data?.counts ?? {};
  const recent = data?.recent ?? [];
  const allTags = useMemo(() => data?.tags ?? [], [data]);

  return (
    <>
      <PageHeader title="Tools" />
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* counts */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["pending","running","done","failed","paused"] as JobStatus[]).map((s) => (
            <div key={s} style={{
              padding: "6px 12px", borderRadius: 6,
              background: STATUS_COLORS[s], color: "white", fontSize: 12,
            }}>
              {s}: <strong>{counts[s] ?? 0}</strong>
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12 }}>
              <input type="checkbox" checked={poll} onChange={(e) => setPoll(e.target.checked)} />
              auto-refresh
            </label>
            <button onClick={refresh} disabled={!!busy}>Refresh</button>
          </div>
        </div>

        {/* redis queues */}
        <div style={{ fontSize: 12, color: "#666" }}>
          Redis queues:&nbsp;
          {Object.entries(data?.redis_queues ?? {}).map(([q, n]) => (
            <span key={q} style={{ marginRight: 12 }}>{q}: <strong>{n}</strong></span>
          ))}
        </div>

        {/* actions */}
        <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onCheckGaps}  disabled={!!busy}>{busy === "gaps"   ? "..." : "Check + Enqueue Gaps"}</button>
          <button onClick={onCheckMeta}  disabled={!!busy}>{busy === "meta"   ? "..." : "Check + Enqueue Stale Metadata"}</button>
          <button onClick={onTrainAAPL}  disabled={!!busy}>{busy === "train"  ? "..." : "Train Model (AAPL)"}</button>
          <button onClick={onRetry}      disabled={!!busy}>{busy === "retry"  ? "..." : "Retry Failed"}</button>
          <button onClick={onPauseAll}   disabled={!!busy} style={{ marginLeft: "auto" }}>
            {busy === "pauseAll" ? "..." : "Pause All Pending"}
          </button>
          <button onClick={onResumeAll}  disabled={!!busy}>{busy === "resumeAll" ? "..." : "Resume All Paused"}</button>
        </section>

        {msg && <div style={{ fontSize: 13, color: "#1a73e8" }}>{msg}</div>}

        {/* filters */}
        <section style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 12 }}>Tag filter (AND):</strong>
          {allTags.length === 0 && <span style={{ fontSize: 12, color: "#999" }}>(none yet)</span>}
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 12,
                background: filterTags.includes(t) ? "#1a73e8" : "#eee",
                color:      filterTags.includes(t) ? "white"   : "#333",
                border: "none", cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
          <select
            value={filterStatus}
            onChange={(e) => setSt(e.target.value as JobStatus | "")}
            style={{ marginLeft: 12, fontSize: 12 }}
          >
            <option value="">all statuses</option>
            {(["pending","running","done","failed","paused"] as JobStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(filterTags.length > 0 || filterStatus) && (
            <button onClick={() => { setTags([]); setSt(""); }} style={{ fontSize: 11 }}>clear</button>
          )}
        </section>

        {/* table */}
        <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ background: "#f5f5f5" }}>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Type</th>
                <th style={th}>Status</th>
                <th style={th}>Tags</th>
                <th style={th}>Pri</th>
                <th style={th}>Attempts</th>
                <th style={th}>Created</th>
                <th style={th}>Started</th>
                <th style={th}>Finished</th>
                <th style={th}>Paused</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={11} style={{ padding: 12, textAlign: "center", color: "#999" }}>no jobs</td></tr>
              )}
              {recent.map((j: JobRow) => (
                <tr key={j.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{j.id}</td>
                  <td style={td}>{j.job_type}</td>
                  <td style={td}>
                    <span style={{
                      padding: "2px 6px", borderRadius: 4,
                      background: STATUS_COLORS[j.status], color: "white",
                    }}>{j.status}</span>
                  </td>
                  <td style={td}>
                    {(j.tags ?? []).map((t) => (
                      <span key={t} style={{
                        marginRight: 4, padding: "1px 6px", borderRadius: 8,
                        background: "#eee", fontSize: 10,
                      }}>{t}</span>
                    ))}
                  </td>
                  <td style={td}>{j.priority}</td>
                  <td style={td}>{j.attempts}/{j.max_attempts}</td>
                  <td style={td}>{fmt(j.created_at)}</td>
                  <td style={td}>{fmt(j.started_at)}</td>
                  <td style={td}>{fmt(j.finished_at)}</td>
                  <td style={td}>{fmt(j.paused_at)}</td>
                  <td style={td}>
                    {(j.status === "pending" || j.status === "running") && (
                      <button
                        onClick={() => run(`pause-${j.id}`, async () => {
                          await pauseJob(j.id);
                          return `Paused #${j.id}`;
                        })}
                        disabled={!!busy}
                        style={{ fontSize: 10 }}
                      >pause</button>
                    )}
                    {j.status === "paused" && (
                      <button
                        onClick={() => run(`resume-${j.id}`, async () => {
                          await resumeJob(j.id);
                          return `Resumed #${j.id}`;
                        })}
                        disabled={!!busy}
                        style={{ fontSize: 10 }}
                      >resume</button>
                    )}
                    {j.error_msg && (
                      <span title={j.error_msg} style={{ color: "#d93025", marginLeft: 4 }}>⚠</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "6px 8px", whiteSpace: "nowrap" };
