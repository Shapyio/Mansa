import { useEffect, useRef } from "react";
import {
  ColorType, createChart,
  type CandlestickData, type IChartApi,
  type ISeriesApi, type LineData, type Time,
} from "lightweight-charts";

import type { BarRow } from "../../api/stocks";

export type ChartKind = "candle" | "line" | "area";

type Props = {
  bars: BarRow[];
  kind: ChartKind;
  showVolume?: boolean;
  height?: number;
};

const toTime = (iso: string): Time => iso.slice(0, 10) as Time;

/**
 * lightweight-charts requires strictly ascending, unique time values.
 * Backend rows can occasionally collide once we slice to YYYY-MM-DD
 * (duplicate upserts, intraday bars stored with off-hours timestamps,
 * etc). Sort + last-write-wins dedupe so the chart never asserts.
 */
function sanitize<T extends { time: Time }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) =>
    String(a.time) < String(b.time) ? -1 : String(a.time) > String(b.time) ? 1 : 0
  );
  const out: T[] = [];
  for (const r of sorted) {
    if (out.length && out[out.length - 1].time === r.time) {
      out[out.length - 1] = r;            // last wins
    } else {
      out.push(r);
    }
  }
  return out;
}

const safeNum = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function PriceChart({ bars, kind, showVolume = true, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const priceRef     = useRef<ISeriesApi<any> | null>(null);
  const volRef       = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const styles = getComputedStyle(document.documentElement);
    const text   = styles.getPropertyValue("--text").trim()       || "#e7eaf0";
    const muted  = styles.getPropertyValue("--text-muted").trim() || "#8a93a4";
    const line   = styles.getPropertyValue("--line").trim()       || "rgba(255,255,255,0.06)";
    const bg     = styles.getPropertyValue("--bg-1").trim()       || "#0f1115";

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor:  text,
      },
      grid: {
        vertLines: { color: line },
        horzLines: { color: line },
      },
      rightPriceScale: { borderColor: line },
      timeScale:       { borderColor: line, timeVisible: true, secondsVisible: false },
      crosshair: {
        mode: 1,
        vertLine: { color: muted, width: 1, style: 3 },
        horzLine: { color: muted, width: 1, style: 3 },
      },
    });
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      priceRef.current = null;
      volRef.current   = null;
    };
  }, []);

  // (Re)build the price series when chart kind changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (priceRef.current) {
      chart.removeSeries(priceRef.current);
      priceRef.current = null;
    }

    if (kind === "candle") {
      priceRef.current = chart.addCandlestickSeries({
        upColor:        "#10b981",
        downColor:      "#f43f5e",
        wickUpColor:    "#10b981",
        wickDownColor:  "#f43f5e",
        borderVisible:  false,
      });
    } else if (kind === "line") {
      priceRef.current = chart.addLineSeries({
        color: "#10b981", lineWidth: 2,
      });
    } else {
      priceRef.current = chart.addAreaSeries({
        topColor:    "rgba(16,185,129,0.35)",
        bottomColor: "rgba(16,185,129,0)",
        lineColor:   "#10b981",
        lineWidth:   2,
      });
    }
  }, [kind]);

  // Volume histogram (separate scale)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (showVolume && !volRef.current) {
      volRef.current = chart.addHistogramSeries({
        color: "rgba(138,147,164,0.45)",
        priceFormat:   { type: "volume" },
        priceScaleId:  "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
    } else if (!showVolume && volRef.current) {
      chart.removeSeries(volRef.current);
      volRef.current = null;
    }
  }, [showVolume]);

  // Push data
  useEffect(() => {
    const series = priceRef.current;
    if (!series) return;

    if (kind === "candle") {
      const raw: CandlestickData[] = bars
        .map((b) => {
          const o = safeNum(b.open), h = safeNum(b.high), l = safeNum(b.low), c = safeNum(b.close);
          if (o == null || h == null || l == null || c == null) return null;
          return { time: toTime(b.timestamp), open: o, high: h, low: l, close: c };
        })
        .filter((x): x is CandlestickData => x != null);
      series.setData(sanitize(raw));
    } else {
      const raw: LineData[] = bars
        .map((b) => {
          const c = safeNum(b.close);
          if (c == null) return null;
          return { time: toTime(b.timestamp), value: c };
        })
        .filter((x): x is LineData => x != null);
      series.setData(sanitize(raw));
    }

    if (volRef.current) {
      const raw = bars
        .map((b) => {
          const v = safeNum(b.volume);
          if (v == null) return null;
          const o = safeNum(b.open), c = safeNum(b.close);
          return {
            time:  toTime(b.timestamp),
            value: v,
            color: (o != null && c != null && c >= o)
              ? "rgba(16,185,129,0.45)" : "rgba(244,63,94,0.45)",
          };
        })
        .filter((x): x is { time: Time; value: number; color: string } => x != null);
      volRef.current.setData(sanitize(raw));
    }

    chartRef.current?.timeScale().fitContent();
  }, [bars, kind]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
