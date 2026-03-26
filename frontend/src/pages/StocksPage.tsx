import { useEffect, useState } from "react";
import { getStocks } from "../api/stocks";
import PageHeader from "../components/layout/PageHeader";

type Stock = {
  symbol: string;
  last_price: number;
  volume?: number;
};

export default function Stocks() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadStocks() {
    try {
      const data = await getStocks();
      if (Array.isArray(data)) setStocks(data);
      else if (data.stocks) setStocks(data.stocks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStocks();
  }, []);

  const filtered = stocks.filter((s) =>
    s.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Stocks" />
      <div style={{ padding: "20px" }}>
        <input
          className="table-search"
          placeholder="Search symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "300px", marginBottom: "10px" }}
        />

        {loading && <p style={{ color: "#6b7280" }}>Loading...</p>}

        {!loading && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Volume</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 && (
                  <tr className="empty-row">
                    <td colSpan={3}>No results found</td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.symbol}>
                    <td className="col-symbol">{s.symbol}</td>
                    <td className="col-numeric">${s.last_price.toFixed(2)}</td>
                    <td className="col-numeric">
                      {s.volume != null ? s.volume.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}