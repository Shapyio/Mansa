import { useState } from "react";
import Widget from "../grid/Widget";
import Button from "../ui/Button";
import {
  checkDataGaps, checkStaleMetadata,
  enqueueGaps, enqueueMetadataUpdates,
  retryFailedJobs, submitJob,
} from "../../api/jobs";
import type { WidgetEditProps } from "./Registry";

export default function ToolsWidget({ editMode, onRemove }: WidgetEditProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg,  setMsg ] = useState<string | null>(null);

  const run = (label: string, fn: () => Promise<string>) => async () => {
    setBusy(label); setMsg(null);
    try { setMsg(await fn()); }
    catch (e) { setMsg(`Error: ${(e as Error).message}`); }
    finally   { setBusy(null); }
  };

  return (
    <Widget title="Quick Tools" subtitle="One-click checks & actions" editMode={editMode} onRemove={onRemove}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-2)" }}>
        <Button disabled={!!busy} onClick={run("gaps", async () => {
          const r = await checkDataGaps();
          if (!r.count) return "No gaps found";
          const e = await enqueueGaps(r.gaps);
          return `Found ${r.count} gaps · enqueued ${e.enqueued}`;
        })}>
          {busy === "gaps" ? "Checking…" : "Check + Enqueue Gaps"}
        </Button>
        <Button disabled={!!busy} onClick={run("meta", async () => {
          const r = await checkStaleMetadata();
          if (!r.count) return "No stale metadata";
          const e = await enqueueMetadataUpdates(r.companies.map((c: any) => c.id));
          return `${r.count} stale · enqueued ${e.enqueued}`;
        })}>
          {busy === "meta" ? "Checking…" : "Stale Metadata"}
        </Button>
        <Button disabled={!!busy} onClick={run("train", async () => {
          const r = await submitJob("train_model", { symbol: "AAPL" }, { tags: ["Manual"] });
          return `Queued train_model #${r.pg_job_id}`;
        })}>
          {busy === "train" ? "Queuing…" : "Train Model (AAPL)"}
        </Button>
        <Button variant="ghost" disabled={!!busy} onClick={run("retry", async () => {
          const r = await retryFailedJobs();
          return `Retried ${r.retried} failed jobs`;
        })}>
          {busy === "retry" ? "Retrying…" : "Retry Failed"}
        </Button>

        {msg && (
          <div style={{
            marginTop: "var(--s-2)", padding: "8px 10px",
            background: "var(--bg-2)", border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)", fontSize: "var(--fs-sm)", color: "var(--text-muted)",
          }}>{msg}</div>
        )}
      </div>
    </Widget>
  );
}
