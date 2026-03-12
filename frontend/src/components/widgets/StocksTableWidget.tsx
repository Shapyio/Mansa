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
    .filter(s => s.symbol.toLowerCase().includes(search.toLowerCase()))
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
          placeholder="Search symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "8px", width: "100%" }}
        />

        {loading && <p>Loading...</p>}

        {!loading && (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th onClick={() => changeSort("symbol")}>Symbol</th>
                <th onClick={() => changeSort("last_price")}>Price</th>
                <th onClick={() => changeSort("volume")}>Volume</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((s) => (
                <tr key={s.symbol}>
                  <td>{s.symbol}</td>
                  <td>{s.last_price}</td>
                  <td>{s.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </Widget.Content>

    </Widget>
  );
}