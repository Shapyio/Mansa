import { useEffect, useState } from "react";
import Widget from "../grid/Widget";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { IconRefresh } from "../ui/Icons";
import type { WidgetEditProps } from "./Registry";
import { getJobStatus, type JobStatus, type JobStatusResponse } from "../../api/jobs";

const STATUSES: JobStatus[] = ["pending", "running", "done", "failed", "paused"];

export default function JobsWidget({ editMode, onRemove }: WidgetEditProps) {
  const [data, setData] = useState<JobStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setData(await getJobStatus({ limit: 8 })); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Widget
      title="Jobs Queue"
      subtitle="Live worker activity"
      editMode={editMode} onRemove={onRemove}
      controls={<Button size="sm" variant="ghost" icon={<IconRefresh />} onClick={load} aria-label="Refresh" />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--s-4)" }}>
        {STATUSES.map((s) => (
          <Badge key={s} tone={s} dot>
            {s} {data?.counts[s] ?? 0}
          </Badge>
        ))}
      </div>

      <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: 8 }}>
        Redis: {Object.entries(data?.redis_queues ?? {}).map(([q, n]) => `${q} ${n}`).join("  ·  ") || "—"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {loading && <div style={{ color: "var(--text-faint)" }}>Loading…</div>}
        {!loading && (data?.recent ?? []).length === 0 && (
          <div style={{ color: "var(--text-faint)", textAlign: "center", padding: "var(--s-6)" }}>No jobs yet</div>
        )}
        {(data?.recent ?? []).slice(0, 8).map((j) => (
          <div key={j.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px",
            background: "var(--bg-2)", border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            fontSize: "var(--fs-sm)",
          }}>
            <span style={{ color: "var(--text-faint)", fontVariantNumeric: "tabular-nums", minWidth: 26 }}>#{j.id}</span>
            <span style={{ flex: 1, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {j.job_type}
            </span>
            <Badge tone={j.status as any}>{j.status}</Badge>
          </div>
        ))}
      </div>
    </Widget>
  );
}
