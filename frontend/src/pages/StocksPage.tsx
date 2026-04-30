import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import PageHeader from "../components/layout/PageHeader";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { IconFilter, IconRefresh, IconSearch } from "../components/ui/Icons";
import {
  type IndustryRow, type SectorRow, type StockRow,
  getIndustries, getSectors, getStocks,
} from "../api/stocks";

type SortKey = "symbol" | "last_price" | "day_change_pct" | "volume" | "sector" | "last_update";
type SortDir = "asc" | "desc";

const fmtMoney = (n: number | null | undefined) => n == null ? "—" : `$${Number(n).toFixed(2)}`;
const fmtPct   = (n: number | null | undefined) => n == null ? "—" : `${Number(n).toFixed(2)}%`;
const fmtInt   = (n: number | null | undefined) => n == null ? "—" : Number(n).toLocaleString();
const ageDays  = (iso: string | null) => iso ? (Date.now() - new Date(iso).getTime()) / 86400e3 : Infinity;
const fmtAgo   = (iso: string | null) => {
  if (!iso) return "—";
  const d = ageDays(iso);
  if (d < 1)  return "today";
  if (d < 2)  return "1d ago";
  if (d < 30) return `${Math.floor(d)}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

export default function Stocks() {
  const [stocks,    setStocks]    = useState<StockRow[]>([]);
  const [sectors,   setSectors]   = useState<SectorRow[]>([]);
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [search,     setSearch]     = useState("");
  const [sectorId,   setSectorId]   = useState<number | "">("");
  const [industryId, setIndustryId] = useState<number | "">("");
  const [sortKey,    setSortKey]    = useState<SortKey>("symbol");
  const [sortDir,    setSortDir]    = useState<SortDir>("asc");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStocks({
        sector_id:   sectorId   === "" ? undefined : sectorId,
        industry_id: industryId === "" ? undefined : industryId,
      });
      setStocks(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [sectorId, industryId]);
  useEffect(() => { getSectors().then(setSectors).catch(() => {}); }, []);
  useEffect(() => {
    getIndustries(sectorId === "" ? undefined : sectorId)
      .then(setIndustries).catch(() => {});
    setIndustryId("");
  }, [sectorId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = q
      ? stocks.filter((s) =>
          s.symbol.toLowerCase().includes(q) ||
          (s.name ?? "").toLowerCase().includes(q))
      : stocks;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const av = a[sortKey] as any; const bv = b[sortKey] as any;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    });
  }, [stocks, search, sortKey, sortDir]);

  const onHeader = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const arrow = (k: SortKey) =>
    sortKey === k ? <span style={{ opacity: 0.6 }}>{sortDir === "asc" ? "↑" : "↓"}</span> : null;

  return (
    <>
      <PageHeader
        title="Stocks"
        subtitle={`${filtered.length} of ${stocks.length} symbols`}
        actions={<Button variant="ghost" icon={<IconRefresh />} onClick={load}>Refresh</Button>}
      />

      {/* Filter bar */}
      <div className="card card--padded" style={{
        display: "grid",
        gridTemplateColumns: "1fr 200px 200px auto",
        gap: "var(--s-3)",
        alignItems: "center",
        marginBottom: "var(--s-4)",
      }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }}>
            <IconSearch size={14} />
          </span>
          <input
            className="input"
            placeholder="Search symbol or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>

        <select className="input select" value={sectorId} onChange={(e) => setSectorId(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">All sectors</option>
          {sectors.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.company_count})</option>)}
        </select>

        <select className="input select" value={industryId} onChange={(e) => setIndustryId(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">All industries</option>
          {industries.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.company_count})</option>)}
        </select>

        {(search || sectorId !== "" || industryId !== "") && (
          <Button variant="ghost" icon={<IconFilter />} onClick={() => { setSearch(""); setSectorId(""); setIndustryId(""); }}>
            Clear
          </Button>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflow: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th className="sortable" onClick={() => onHeader("symbol")}>Symbol {arrow("symbol")}</th>
                <th>Name</th>
                <th className="sortable" onClick={() => onHeader("sector")}>Sector {arrow("sector")}</th>
                <th>Industry</th>
                <th className="num sortable" onClick={() => onHeader("last_price")}>Last {arrow("last_price")}</th>
                <th className="num sortable" onClick={() => onHeader("day_change_pct")}>Day Δ {arrow("day_change_pct")}</th>
                <th className="num sortable" onClick={() => onHeader("volume")}>Volume {arrow("volume")}</th>
                <th className="sortable" onClick={() => onHeader("last_update")}>Data {arrow("last_update")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="empty">Loading…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="empty">No matches</td></tr>}
              {!loading && filtered.map((s) => {
                const tone   = s.day_change_pct == null ? "default" : s.day_change_pct >= 0 ? "up" : "down";
                const stale  = ageDays(s.last_update) > 5;
                return (
                  <tr key={s.id} style={{ cursor: "pointer" }}>
                    <td>
                      <Link to={`/stocks/${s.symbol}`} style={{ fontWeight: 600, color: "var(--text)" }}>
                        {s.symbol}
                      </Link>
                    </td>
                    <td style={{ color: "var(--text-muted)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name ?? "—"}
                    </td>
                    <td>{s.sector ? <Badge>{s.sector}</Badge> : <span style={{ color: "var(--text-faint)" }}>—</span>}</td>
                    <td style={{ color: "var(--text-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.industry ?? "—"}
                    </td>
                    <td className="num tabular">{fmtMoney(s.last_price)}</td>
                    <td className="num"><Badge tone={tone}>{fmtPct(s.day_change_pct)}</Badge></td>
                    <td className="num tabular">{fmtInt(s.volume)}</td>
                    <td style={{ color: stale ? "var(--warn)" : "var(--text-muted)" }}>
                      {fmtAgo(s.last_update)} {stale && "⚠"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
