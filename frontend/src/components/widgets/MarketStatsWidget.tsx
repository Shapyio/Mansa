import { useEffect, useState } from "react";
import Widget from "../grid/Widget";
import Stat from "../ui/Stat";
import { IconBolt, IconPerformance, IconStocks } from "../ui/Icons";
import type { WidgetEditProps } from "./Registry";
import { getStocks } from "../../api/stocks";
import { getJobStatus } from "../../api/jobs";

type Stock = { symbol: string; last_price: number; volume?: number };

export default function MarketStatsWidget({ editMode, onRemove }: WidgetEditProps) {
  const [tracked, setTracked] = useState(0);
  const [running, setRunning] = useState(0);
  const [done, setDone]       = useState(0);
  const [topMover, setTopMover] = useState<Stock | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const [s, j] = await Promise.all([getStocks(), getJobStatus({ limit: 1 })]);
      const arr: Stock[] = Array.isArray(s) ? s : (s.stocks ?? []);
      setTracked(arr.length);
      setTopMover(arr[0] ?? null);
      setRunning(j.counts.running ?? 0);
      setDone(j.counts.done ?? 0);
    } catch { /* ignore */ }
  }

  return (
    <Widget title="Market Stats" subtitle="Snapshot of system + market activity" editMode={editMode} onRemove={onRemove} padded={false}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "var(--s-3)",
        padding: "var(--s-3)",
      }}>
        <Stat label="Tracked Symbols" value={tracked} icon={<IconStocks />} />
        <Stat label="Top Last-Price"
              value={topMover ? `$${topMover.last_price.toFixed(2)}` : "—"}
              delta={{ value: topMover?.symbol ?? "—", direction: "up" }}
              icon={<IconPerformance />} />
        <Stat label="Jobs Running" value={running} delta={{ value: `${done} done`, direction: "flat" }} icon={<IconBolt />} />
        <Stat label="Model Accuracy" value="—" delta={{ value: "no model yet", direction: "flat" }} />
      </div>
    </Widget>
  );
}
