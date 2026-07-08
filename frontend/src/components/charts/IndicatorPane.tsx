import { useEffect, useRef } from "react";
import {
  ColorType, createChart, LineStyle,
  type IChartApi, type ISeriesApi,
  type HistogramData, type LineData, type Time,
} from "lightweight-charts";

import type { FeatureRow } from "../../api/stocks";

export type PaneKind = "rsi" | "macd";

type Props = {
  kind:    PaneKind;
  feats:   FeatureRow[];
  height?: number;
  onReady?: (chart: IChartApi) => void;   // parent uses this to wire sync
};

const toTime = (iso: string): Time => iso.slice(0, 10) as Time;
const safeNum = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

function sanitize<T extends { time: Time }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) =>
    String(a.time) < String(b.time) ? -1 : String(a.time) > String(b.time) ? 1 : 0
  );
  const out: T[] = [];
  for (const r of sorted) {
    if (out.length && out[out.length - 1].time === r.time) out[out.length - 1] = r;
    else out.push(r);
  }
  return out;
}

export default function IndicatorPane({ kind, feats, height = 140, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  // For MACD we hold three series; for RSI just one. Store as a map.
  const seriesRef    = useRef<Record<string, ISeriesApi<any>>>({});

  // Build chart once. Time axis is hidden — the master price chart shows it.
  useEffect(() => {
    if (!containerRef.current) return;
    const styles = getComputedStyle(document.documentElement);
    const text   = styles.getPropertyValue("--text").trim()       || "#e7eaf0";
    const muted  = styles.getPropertyValue("--text-muted").trim() || "#8a93a4";
    const line   = styles.getPropertyValue("--line").trim()       || "rgba(255,255,255,0.06)";
    const bg     = styles.getPropertyValue("--bg-1").trim()       || "#0f1115";

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout:   { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid:     { vertLines: { color: line }, horzLines: { color: line } },
      rightPriceScale: { borderColor: line },
      timeScale: { borderColor: line, visible: false },
      crosshair: {
        mode: 1,
        vertLine: { color: muted, width: 1, style: 3 },
        horzLine: { color: muted, width: 1, style: 3 },
      },
      handleScroll: false,
      handleScale:  false,
    });
    chartRef.current = chart;
    onReady?.(chart);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
    };
    // onReady is intentionally not a dep — parent should keep it stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the right series set for the pane kind.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    for (const s of Object.values(seriesRef.current)) chart.removeSeries(s);
    seriesRef.current = {};

    if (kind === "rsi") {
      const rsi = chart.addLineSeries({
        color: "#38bdf8", lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
      });
      // Reference bands at 30 / 70 — the classic RSI overbought/oversold lines.
      rsi.createPriceLine({
        price: 70, color: "#f43f5e", lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "70",
      });
      rsi.createPriceLine({
        price: 30, color: "#10b981", lineWidth: 1,
        lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "30",
      });
      seriesRef.current.rsi = rsi;
      // Pin the scale to 0..100 so it never rescales as data changes.
      chart.priceScale("right").applyOptions({ autoScale: false });
      rsi.applyOptions({
        priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(1), minMove: 0.1 },
      });
    } else {
      // MACD: histogram bars for macd_hist, plus macd and signal lines.
      const hist = chart.addHistogramSeries({
        priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(3), minMove: 0.001 },
      });
      const macd = chart.addLineSeries({
        color: "#38bdf8", lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
      });
      const sig  = chart.addLineSeries({
        color: "#f59e0b", lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
      });
      seriesRef.current.hist = hist;
      seriesRef.current.macd = macd;
      seriesRef.current.sig  = sig;
    }
  }, [kind]);

  // Push data whenever feats or kind changes.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (kind === "rsi") {
      const rsi = seriesRef.current.rsi as ISeriesApi<"Line"> | undefined;
      if (!rsi) return;
      const rows: LineData[] = feats
        .map((f) => {
          const v = safeNum(f.rsi_14);
          if (v == null) return null;
          return { time: toTime(f.date), value: v };
        })
        .filter((x): x is LineData => x != null);
      rsi.setData(sanitize(rows));
      // Force 0..100 view.
      chart.priceScale("right").applyOptions({ autoScale: false });
      rsi.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
    } else {
      const hist = seriesRef.current.hist as ISeriesApi<"Histogram"> | undefined;
      const macd = seriesRef.current.macd as ISeriesApi<"Line"> | undefined;
      const sig  = seriesRef.current.sig  as ISeriesApi<"Line"> | undefined;
      if (!hist || !macd || !sig) return;

      const macdRows: LineData[] = [];
      const sigRows:  LineData[] = [];
      const histRows: HistogramData[] = [];
      for (const f of feats) {
        const t = toTime(f.date);
        const m = safeNum(f.macd);
        const s = safeNum(f.macd_signal);
        const h = safeNum(f.macd_hist);
        if (m != null) macdRows.push({ time: t, value: m });
        if (s != null) sigRows.push({  time: t, value: s });
        if (h != null) histRows.push({
          time: t, value: h,
          color: h >= 0 ? "rgba(16,185,129,0.55)" : "rgba(244,63,94,0.55)",
        });
      }
      hist.setData(sanitize(histRows));
      macd.setData(sanitize(macdRows));
      sig.setData(sanitize(sigRows));
    }
  }, [feats, kind]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
