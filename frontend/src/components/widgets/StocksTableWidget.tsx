import { useEffect, useState } from "react";
import Widget from "../grid/Widget";
import { getStocks } from "../../api/stocks";

type Stock = {
  symbol: string;
  last_price: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
};

export default function StocksTableWidget() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Stock>("symbol");
  const [sortAsc, setSortAsc] = useState(true);

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

  const filtered = stocks
    .filter((s) => s.symbol.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

  function changeSort(key: keyof Stock) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function sortArrow(key: keyof Stock) {
    if (sortKey !== key) return "↕";
    return sortAsc ? "↑" : "↓";
  }

  const columns: { key: keyof Stock; label: string }[] = [
    { key: "symbol", label: "Symbol" },
    { key: "last_price", label: "Price" },
    { key: "volume", label: "Volume" },
  ];

  return (
    <Widget>
      <Widget.Header>
        <span>Stocks</span>
        <Widget.Controls>
          <button onClick={loadStocks}>Refresh</button>
        </Widget.Controls>
      </Widget.Header>

      <Widget.Content>
        <input
          className="table-search"
          placeholder="Search symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && <p style={{ color: "#6b7280", fontSize: "13px" }}>Loading...</p>}

        {!loading && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map(({ key, label }) => (
                    <th
                      key={key}
                      className={`sortable${sortKey === key ? " sort-active" : ""}`}
                      onClick={() => changeSort(key)}
                    >
                      {label}
                      <span className="sort-arrow">{sortArrow(key)}</span>
                    </th>
                  ))}
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
      </Widget.Content>
    </Widget>
  );
}