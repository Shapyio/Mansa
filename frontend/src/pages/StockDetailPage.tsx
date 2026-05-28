import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

import PageHeader from "../components/layout/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { IconRefresh } from "../components/ui/Icons";
import PriceChart, { type ChartKind, type Overlay } from "../components/charts/PriceChart";
import {
  type BarRow, type FeatureRow, type StockProfile,
  getStockFeatures, getStockHistory, getStockProfile,
} from "../api/stocks";

type IndicatorKey = "sma_20" | "sma_50" | "ema_12" | "ema_26" | "bb";

const INDICATOR_DEFS: { key: IndicatorKey; label: string; color: string }[] = [
  { key: "sma_20", label: "SMA 20", color: "#38bdf8" }, // sky
  { key: "sma_50", label: "SMA 50", color: "#a855f7" }, // violet
  { key: "ema_12", label: "EMA 12", color: "#f59e0b" }, // amber
  { key: "ema_26", label: "EMA 26", color: "#fb7185" }, // rose
  { key: "bb",     label: "Bollinger 20/2σ", color: "#94a3b8" },
];

type RangeKey = "1D" | "1W" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "5Y" | "ALL" | "CUSTOM";

const RANGES: RangeKey[] = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"];

function rangeBounds(key: RangeKey, last: Date): { start?: Date; end: Date } {
  const end = new Date(last);
  const s   = new Date(last);
  switch (key) {
    case "1D":  s.setDate(s.getDate() - 1);   return { start: s, end };
    case "1W":  s.setDate(s.getDate() - 7);   return { start: s, end };
    case "1M":  s.setMonth(s.getMonth() - 1); return { start: s, end };
    case "3M":  s.setMonth(s.getMonth() - 3); return { start: s, end };
    case "6M":  s.setMonth(s.getMonth() - 6); return { start: s, end };
    case "YTD": return { start: new Date(end.getFullYear(), 0, 1), end };
    case "1Y":  s.setFullYear(s.getFullYear() - 1); return { start: s, end };
    case "5Y":  s.setFullYear(s.getFullYear() - 5); return { start: s, end };
    case "ALL": return { end };                       // no start
    case "CUSTOM": return { end };                    // caller supplies
  }
}

const fmtMoney = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : `$${n.toFixed(d)}`;
const fmtPct = (n: number | null | undefined, d = 2) =>
  n == null ? "—" : `${n.toFixed(d)}%`;
const fmtBig = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9 ).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6 ).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
};
const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Number(n).toLocaleString();
const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString() : "—";

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const sym = symbol.toUpperCase();

  const [profile, setProfile] = useState<StockProfile | null>(null);
  const [bars,    setBars]    = useState<BarRow[]>([]);
  const [feats,   setFeats]   = useState<FeatureRow[]>([]);
  const [range,   setRange]   = useState<RangeKey>("6M");
  const [kind,    setKind]    = useState<ChartKind>("candle");
  const [showVol, setShowVol] = useState(true);
  const [custom,  setCustom]  = useState<{ start: string; end: string }>({
    start: "", end: "",
  });
  const [loading,  setLoading]   = useState(true);
  const [err,      setErr]       = useState<string | null>(null);
  const [active,   setActive]    = useState<Set<IndicatorKey>>(new Set());

  // Profile load
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    getStockProfile(sym)
      .then((p) => { if (!cancelled) setProfile(p); })
      .catch((e) => { if (!cancelled) setErr((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sym]);

  // Load bars + features whenever the range changes. Relative ranges (1M, YTD…)
  // anchor off the company's last data date, so we wait for the profile first.
  useEffect(() => {
    if (!profile?.last_update) return;
    let cancelled = false;

    const last = new Date(profile.last_update);
    let start: string | undefined;
    let end:   string | undefined;
    if (range === "CUSTOM") {
      start = custom.start || undefined;
      end   = custom.end   || undefined;
    } else {
      const b = rangeBounds(range, last);
      start = b.start?.toISOString().slice(0, 10);
      end   = b.end.toISOString().slice(0, 10);
    }
    Promise.all([
      getStockHistory(sym, start, end),
      getStockFeatures(sym, start, end).catch(() => [] as FeatureRow[]),
    ])
      .then(([b, f]) => {
        if (cancelled) return;
        setBars(b);
        setFeats(f);
      })
      .catch((e) => { if (!cancelled) setErr((e as Error).message); });
    return () => { cancelled = true; };
  }, [sym, range, custom.start, custom.end, profile?.last_update]);

  const overlays = useMemo<Overlay[]>(() => {
    if (active.size === 0 || feats.length === 0) return [];
    const out: Overlay[] = [];

    if (active.has("sma_20")) out.push({
      id: "sma_20", color: "#38bdf8", lineWidth: 2,
      data: feats.map((f) => ({ date: f.date, value: f.sma_20 })),
    });
    if (active.has("sma_50")) out.push({
      id: "sma_50", color: "#a855f7", lineWidth: 2,
      data: feats.map((f) => ({ date: f.date, value: f.sma_50 })),
    });
    if (active.has("ema_12")) out.push({
      id: "ema_12", color: "#f59e0b", lineWidth: 2,
      data: feats.map((f) => ({ date: f.date, value: f.ema_12 })),
    });
    if (active.has("ema_26")) out.push({
      id: "ema_26", color: "#fb7185", lineWidth: 2,
      data: feats.map((f) => ({ date: f.date, value: f.ema_26 })),
    });
    if (active.has("bb")) {
      out.push({
        id: "bb_upper", color: "#94a3b8", lineWidth: 1, lineStyle: 2,
        data: feats.map((f) => ({ date: f.date, value: f.bb_upper })),
      });
      out.push({
        id: "bb_lower", color: "#94a3b8", lineWidth: 1, lineStyle: 2,
        data: feats.map((f) => ({ date: f.date, value: f.bb_lower })),
      });
    }
    return out;
  }, [active, feats]);

  const toggle = (k: IndicatorKey) => setActive((cur) => {
    const next = new Set(cur);
    next.has(k) ? next.delete(k) : next.add(k);
    return next;
  });

  const dayChange = profile?.day_change_pct;
  const tone      = dayChange == null ? "default" : dayChange >= 0 ? "up" : "down";

  const stale = useMemo(() => {
    if (!profile?.last_update) return false;
    const ageDays = (Date.now() - new Date(profile.last_update).getTime()) / 86400e3;
    return ageDays > 5;
  }, [profile?.last_update]);

  return (
    <>
      <PageHeader
        title={profile?.name ? `${sym} · ${profile.name}` : sym}
        subtitle={
          profile
            ? [profile.exchange, profile.sector, profile.industry].filter(Boolean).join(" · ")
            : "Loading…"
        }
        actions={
          <>
            <Link to="/stocks">
              <Button variant="ghost">← All Stocks</Button>
            </Link>
            <Button variant="ghost" icon={<IconRefresh />} onClick={() => {
              getStockProfile(sym).then(setProfile).catch((e) => setErr((e as Error).message));
            }}>Refresh</Button>
          </>
        }
      />

      {err && (
        <div className="card card--padded" style={{ marginBottom: "var(--s-4)", borderColor: "var(--down)", color: "var(--down)" }}>
          {err}
        </div>
      )}

      {loading && !profile && <div className="card card--padded">Loading profile…</div>}

      {profile && (
        <>
          {/* KPI strip */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "var(--s-3)",
            marginBottom: "var(--s-4)",
          }}>
            <Kpi label="Last"          value={fmtMoney(profile.last_price)}
                 sub={dayChange != null && <Badge tone={tone}>{dayChange >= 0 ? "▲" : "▼"} {fmtPct(dayChange)}</Badge>} />
            <Kpi label="Prev Close"    value={fmtMoney(profile.prev_close)} />
            <Kpi label="Volume"        value={fmtInt(profile.volume)} />
            <Kpi label="52W High"      value={fmtMoney(profile.hi_52w)} />
            <Kpi label="52W Low"       value={fmtMoney(profile.lo_52w)} />
            <Kpi label="Market Cap"    value={fmtBig(profile.market_cap)} />
            <Kpi label="P/E"           value={profile.pe_ratio != null ? profile.pe_ratio.toFixed(2) : "—"} />
            <Kpi label="Employees"     value={fmtInt(profile.employees)} />
          </div>

          {/* Range / chart-kind controls */}
          <div className="card card--padded" style={{
            display: "flex", flexWrap: "wrap", gap: "var(--s-3)", alignItems: "center",
            marginBottom: "var(--s-3)",
          }}>
            <div className="tabs">
              {RANGES.map((r) => (
                <button key={r} className={`tab ${range === r ? "tab--active" : ""}`}
                        onClick={() => setRange(r)}>{r}</button>
              ))}
              <button className={`tab ${range === "CUSTOM" ? "tab--active" : ""}`}
                      onClick={() => setRange("CUSTOM")}>Custom</button>
            </div>

            {range === "CUSTOM" && (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input className="input" type="date" style={{ width: 150 }}
                       value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} />
                <span style={{ color: "var(--text-faint)" }}>→</span>
                <input className="input" type="date" style={{ width: 150 }}
                       value={custom.end}   onChange={(e) => setCustom({ ...custom, end: e.target.value })} />
              </span>
            )}

            <div className="tabs" style={{ marginLeft: "auto" }}>
              {(["candle", "line", "area"] as ChartKind[]).map((k) => (
                <button key={k} className={`tab ${kind === k ? "tab--active" : ""}`}
                        onClick={() => setKind(k)}>{k}</button>
              ))}
            </div>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
              <input type="checkbox" checked={showVol} onChange={(e) => setShowVol(e.target.checked)} />
              volume
            </label>
          </div>

          {/* Indicator toggles */}
          <div className="card card--padded" style={{
            display: "flex", flexWrap: "wrap", gap: "var(--s-2)", alignItems: "center",
            marginBottom: "var(--s-3)",
          }}>
            <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "var(--s-2)" }}>
              Indicators
            </span>
            {INDICATOR_DEFS.map((d) => {
              const on = active.has(d.key);
              return (
                <button
                  key={d.key}
                  onClick={() => toggle(d.key)}
                  className={`btn btn--sm${on ? "" : " btn--ghost"}`}
                  style={on ? {
                    background: d.color, borderColor: d.color, color: "#04130d",
                  } : undefined}
                >
                  <span style={{
                    display: "inline-block", width: 10, height: 2,
                    background: d.color, marginRight: 6, verticalAlign: "middle",
                  }} />
                  {d.label}
                </button>
              );
            })}
            {feats.length === 0 && (
              <span style={{ marginLeft: "auto", fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}>
                No features computed yet — run "Recompute Features" on the Tools page.
              </span>
            )}
          </div>

          {/* Chart */}
          <div className="card" style={{ padding: 4, marginBottom: "var(--s-4)" }}>
            {bars.length === 0 ? (
              <div style={{ padding: "var(--s-8)", color: "var(--text-faint)", textAlign: "center" }}>
                No data in selected range.
              </div>
            ) : (
              <PriceChart bars={bars} kind={kind} showVolume={showVol} overlays={overlays} height={460} />
            )}
            <div style={{
              padding: "8px 12px", fontSize: "var(--fs-xs)", color: "var(--text-muted)",
              borderTop: "1px solid var(--line)",
              display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              <span>{bars.length.toLocaleString()} bars · drag to pan · scroll to zoom · hover for OHLC</span>
              {stale && <span style={{ color: "var(--warn)" }}>⚠ Last data {fmtDate(profile.last_update)} (stale &gt; 5 days)</span>}
            </div>
          </div>

          {/* Metadata grid */}
          <div className="card card--padded">
            <div style={{ fontSize: "var(--fs-md)", fontWeight: 500, marginBottom: "var(--s-3)" }}>Metadata</div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "var(--s-3) var(--s-5)",
              fontSize: "var(--fs-sm)",
            }}>
              <Field label="Symbol"        value={profile.symbol} />
              <Field label="Name"          value={profile.name ?? "—"} />
              <Field label="Exchange"      value={profile.exchange ?? "—"} />
              <Field label="Sector"        value={profile.sector ?? "—"} />
              <Field label="Industry"      value={profile.industry ?? "—"} />
              <Field label="Country"       value={profile.country ?? "—"} />
              <Field label="State"         value={profile.state ?? "—"} />
              <Field label="City"          value={profile.city ?? "—"} />
              <Field label="Bars Stored"   value={fmtInt(profile.bar_count)} />
              <Field label="Data First"    value={fmtDate(profile.first_update)} />
              <Field label="Data Last"     value={
                <span style={{ color: stale ? "var(--warn)" : "var(--text)" }}>
                  {fmtDate(profile.last_update)}
                </span>
              } />
              <Field label="Metadata Updated" value={fmtDate(profile.metadata_updated_at)} />
              <Field label="All-time High" value={fmtMoney(profile.high_all)} />
              <Field label="All-time Low"  value={fmtMoney(profile.low_all)} />
              <Field label="Dividend Yield" value={fmtPct(profile.dividend_yield)} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="surface" style={{ padding: "10px 14px" }}>
      <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div className="tabular" style={{ fontSize: "var(--fs-xl)", fontWeight: 600, marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "var(--text)" }}>{value}</div>
    </div>
  );
}
