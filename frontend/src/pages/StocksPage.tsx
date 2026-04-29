import { useEffect, useState } from "react";
import { getStocks } from "../api/stocks";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import { IconRefresh, IconSearch } from "../components/ui/Icons";

type Stock = { symbol: string; last_price: number; volume?: number };

export default function Stocks() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const d: any = await getStocks();
      setStocks(Array.isArray(d) ? d : (d.stocks ?? []));
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = stocks.filter((s) => s.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Stocks"
        subtitle={`${stocks.length} symbols tracked`}
        actions={<Button variant="ghost" icon={<IconRefresh />} onClick={load}>Refresh</Button>}
      />

      <div className="card card--padded" style={{ marginBottom: "var(--s-4)" }}>
        <div style={{ position: "relative", maxWidth: 360 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }}>
            <IconSearch size={14} />
          </span>
          <input
            className="input"
            placeholder="Search symbol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflow: "auto" }}>
          <table className="tbl tabular">
            <thead>
              <tr><th>Symbol</th><th className="num">Last</th><th className="num">Volume</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} className="empty">Loading…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={3} className="empty">No results</td></tr>}
              {!loading && filtered.map((s) => (
                <tr key={s.symbol}>
                  <td><span style={{ fontWeight: 500 }}>{s.symbol}</span></td>
                  <td className="num">${s.last_price.toFixed(2)}</td>
                  <td className="num">{s.volume != null ? s.volume.toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
