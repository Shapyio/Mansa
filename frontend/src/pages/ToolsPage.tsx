import { useEffect, useMemo, useState } from "react";

import PageHeader from "../components/layout/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { IconFilter, IconPause, IconPlay, IconRefresh } from "../components/ui/Icons";
import {
  type JobRow, type JobStatus, type JobStatusResponse,
  checkDataGaps, checkStaleMetadata, enqueueGaps, enqueueMetadataUpdates,
  getJobStatus, pauseAll, pauseJob, resumeAll, resumeJob,
  retryFailedJobs, submitJob,
} from "../api/jobs";

const STATUSES: JobStatus[] = ["pending", "running", "done", "failed", "paused"];
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
      setData(await getJobStatus({
        tags:   filterTags.length ? filterTags : undefined,
        status: filterStatus || undefined,
        limit:  100,
      }));
    } catch (e) { setMsg(`Refresh failed: ${(e as Error).message}`); }
  };

  useEffect(() => { void refresh(); }, [filterTags, filterStatus]);
  useEffect(() => {
    if (!poll) return;
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [poll, filterTags, filterStatus]);

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label); setMsg(null);
    try { const out = await fn(); if (out) setMsg(out); await refresh(); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    finally   { setBusy(null); }
  };

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const counts = data?.counts ?? {};
  const recent = data?.recent ?? [];
  const allTags = useMemo(() => data?.tags ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Tools"
        subtitle="Submit, monitor, pause, and resume background jobs"
        actions={
          <>
            <label style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <input type="checkbox" checked={poll} onChange={(e) => setPoll(e.target.checked)} />
              auto-refresh
            </label>
            <Button variant="ghost" icon={<IconRefresh />} onClick={refresh}>Refresh</Button>
          </>
        }
      />

      {/* Counts row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "var(--s-3)", marginBottom: "var(--s-5)",
      }}>
        {STATUSES.map((s) => (
          <div key={s} className="surface" style={{ padding: "var(--s-3) var(--s-4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Badge tone={s} dot>{s}</Badge>
              <span className="tabular" style={{ fontSize: "var(--fs-xl)", fontWeight: 600 }}>
                {counts[s] ?? 0}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="card card--padded" style={{ marginBottom: "var(--s-5)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s-2)" }}>
          <Button variant="primary" disabled={!!busy} onClick={() => run("gaps", async () => {
            const r = await checkDataGaps();
            if (!r.count) return "No gaps found";
            const e = await enqueueGaps(r.gaps);
            return `Found ${r.count} gaps · enqueued ${e.enqueued}`;
          })}>{busy === "gaps" ? "…" : "Check + Enqueue Gaps"}</Button>

          <Button disabled={!!busy} onClick={() => run("meta", async () => {
            const r = await checkStaleMetadata();
            if (!r.count) return "No stale metadata";
            const e = await enqueueMetadataUpdates(r.companies.map((c: any) => c.id));
            return `${r.count} stale · enqueued ${e.enqueued}`;
          })}>{busy === "meta" ? "…" : "Stale Metadata"}</Button>

          <Button disabled={!!busy} onClick={() => run("train", async () => {
            const r = await submitJob("train_model", { symbol: "AAPL" }, { tags: ["Manual"] });
            return `Queued train_model #${r.pg_job_id}`;
          })}>{busy === "train" ? "…" : "Train Model (AAPL)"}</Button>

          <Button variant="ghost" disabled={!!busy} onClick={() => run("retry", async () =>
            `Retried ${(await retryFailedJobs()).retried}`)}>
            {busy === "retry" ? "…" : "Retry Failed"}
          </Button>

          <span style={{ marginLeft: "auto", display: "flex", gap: "var(--s-2)" }}>
            <Button variant="danger" disabled={!!busy} icon={<IconPause />} onClick={() => run("pauseAll", async () =>
              `Paused ${(await pauseAll()).paused}`)}>
              Pause All
            </Button>
            <Button disabled={!!busy} icon={<IconPlay />} onClick={() => run("resumeAll", async () =>
              `Resumed ${(await resumeAll()).resumed}`)}>
              Resume All
            </Button>
          </span>
        </div>
        {msg && (
          <div style={{
            marginTop: "var(--s-3)", padding: "8px 10px",
            background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
            fontSize: "var(--fs-sm)", color: "var(--text-muted)",
          }}>{msg}</div>
        )}
      </div>

      {/* Filters */}
      <div className="card card--padded" style={{ marginBottom: "var(--s-5)", display: "flex", flexWrap: "wrap", gap: "var(--s-3)", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
          <IconFilter size={14} /> Tags
        </span>
        {allTags.length === 0 && <span style={{ color: "var(--text-faint)", fontSize: "var(--fs-sm)" }}>(none yet)</span>}
        {allTags.map((t) => {
          const on = filterTags.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={on ? "btn btn--primary btn--sm" : "btn btn--sm"}
            >{t}</button>
          );
        })}
        <select
          className="input select"
          style={{ width: 160, marginLeft: "auto" }}
          value={filterStatus}
          onChange={(e) => setSt(e.target.value as JobStatus | "")}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterTags.length > 0 || filterStatus) && (
          <Button size="sm" variant="ghost" onClick={() => { setTags([]); setSt(""); }}>Clear</Button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflow: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>Type</th><th>Status</th><th>Tags</th>
                <th className="num">Pri</th><th className="num">Attempts</th>
                <th>Created</th><th>Started</th><th>Finished</th><th>Paused</th><th></th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={11} className="empty">No jobs yet</td></tr>}
              {recent.map((j: JobRow) => (
                <tr key={j.id}>
                  <td className="tabular" style={{ color: "var(--text-faint)" }}>#{j.id}</td>
                  <td>{j.job_type}</td>
                  <td><Badge tone={j.status}>{j.status}</Badge></td>
                  <td>{(j.tags ?? []).map((t) => <Badge key={t}>{t}</Badge>)}</td>
                  <td className="num tabular">{j.priority}</td>
                  <td className="num tabular">{j.attempts}/{j.max_attempts}</td>
                  <td className="tabular" style={{ color: "var(--text-muted)" }}>{fmt(j.created_at)}</td>
                  <td className="tabular" style={{ color: "var(--text-muted)" }}>{fmt(j.started_at)}</td>
                  <td className="tabular" style={{ color: "var(--text-muted)" }}>{fmt(j.finished_at)}</td>
                  <td className="tabular" style={{ color: "var(--text-muted)" }}>{fmt(j.paused_at)}</td>
                  <td>
                    {(j.status === "pending" || j.status === "running") && (
                      <Button size="sm" variant="ghost" icon={<IconPause />} onClick={() => run(`p${j.id}`, async () => {
                        await pauseJob(j.id); return `Paused #${j.id}`;
                      })}>Pause</Button>
                    )}
                    {j.status === "paused" && (
                      <Button size="sm" variant="ghost" icon={<IconPlay />} onClick={() => run(`r${j.id}`, async () => {
                        await resumeJob(j.id); return `Resumed #${j.id}`;
                      })}>Resume</Button>
                    )}
                    {j.error_msg && (
                      <span title={j.error_msg} style={{ color: "var(--down)", marginLeft: 6 }}>⚠</span>
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
