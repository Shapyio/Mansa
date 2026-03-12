import { useEffect, useState } from "react";
import { getStocks } from "../api/stocks";

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
    <div style={{ padding: "20px" }}>
      <h1>Stocks</h1>

      <input
        placeholder="Search symbol..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ margin: "10px 0", width: "300px" }}
      />

      {loading && <p>Loading...</p>}

      {!loading && (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th align="left">Symbol</th>
              <th align="left">Price</th>
              <th align="left">Volume</th>
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
    </div>
  );
}