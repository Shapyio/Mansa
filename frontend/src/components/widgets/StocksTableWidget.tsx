import { useEffect, useMemo, useState } from "react";
import Widget from "../grid/Widget";
import Button from "../ui/Button";
import { IconRefresh, IconSearch } from "../ui/Icons";
import { getStocks } from "../../api/stocks";
import type { WidgetEditProps } from "./Registry";

type Stock = {
  symbol: string;
  last_price: number;
  open?: number; high?: number; low?: number; close?: number; volume?: number;
};

const COLS: { key: keyof Stock; label: string; numeric?: boolean }[] = [
  { key: "symbol", label: "Symbol" },
  { key: "last_price", label: "Last", numeric: true },
  { key: "volume", label: "Volume", numeric: true },
];

export default function StocksTableWidget({ editMode, onRemove }: WidgetEditProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Stock>("symbol");
  const [asc, setAsc] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d: any = await getStocks();
      setStocks(Array.isArray(d) ? d : (d.stocks ?? []));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(() => {
    const filtered = stocks.filter((s) => s.symbol.toLowerCase().includes(search.toLowerCase()));
    return filtered.sort((a, b) => {
      const av = a[sortKey] ?? 0; const bv = b[sortKey] ?? 0;
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ?  1 : -1;
      return 0;
    });
  }, [stocks, search, sortKey, asc]);

  const headerClick = (k: keyof Stock) => {
    if (sortKey === k) setAsc(!asc);
    else { setSortKey(k); setAsc(true); }
  };

  return (
    <Widget
      title="Stocks"
      subtitle={`${stocks.length} tracked`}
      editMode={editMode} onRemove={onRemove}
      controls={<Button size="sm" variant="ghost" icon={<IconRefresh />} onClick={load} aria-label="Refresh" />}
    >
      <div style={{ position: "relative", marginBottom: "var(--s-3)" }}>
        <span style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          color: "var(--text-faint)",
        }}>
          <IconSearch size={14} />
        </span>
        <input
          className="input"
          placeholder="Filter symbol…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 32 }}
        />
      </div>

      <div style={{ overflow: "auto", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
        <table className="tbl tabular">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key as string}
                  className={`sortable ${c.numeric ? "num" : ""}`}
                  onClick={() => headerClick(c.key)}
                >
                  {c.label} {sortKey === c.key && <span style={{ opacity: 0.6 }}>{asc ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={COLS.length} className="empty">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={COLS.length} className="empty">No matches</td></tr>}
            {!loading && rows.map((s) => (
              <tr key={s.symbol}>
                <td><span style={{ fontWeight: 500 }}>{s.symbol}</span></td>
                <td className="num">${s.last_price.toFixed(2)}</td>
                <td className="num">{s.volume != null ? s.volume.toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  );
}
