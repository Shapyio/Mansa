import { useEffect, useState } from "react";
import Widget from "../grid/Widget";
import { getStocks } from "../../api/stocks";

type Stock = {
  symbol: string;
  last_price: number;
};

export default function StocksTableWidget() {

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStocks() {
    try {
      const data = await getStocks();

      console.log("Stocks response:", data);

      // handle both formats
      if (Array.isArray(data)) {
        setStocks(data);
      } else if (data.stocks) {
        setStocks(data.stocks);
      }

    } catch (err) {
      console.error("Stock load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStocks();
  }, []);

  return (
    <Widget>

      <Widget.Header>
        <span>Stocks</span>

        <Widget.Controls>
          <button onClick={loadStocks}>Refresh</button>
        </Widget.Controls>
      </Widget.Header>

      <Widget.Content>

        {loading && <p>Loading...</p>}

        {!loading && stocks.length === 0 && <p>No stocks found</p>}

        {!loading && stocks.length > 0 && (
          <table style={{ overflowY: "auto", maxHeight: "400px", width: "100%" }}>
            <thead>
              <tr>
                <th align="left">Symbol</th>
                <th align="left">Price</th>
              </tr>
            </thead>

            <tbody>
              {stocks.map((s) => (
                <tr key={s.symbol}>
                  <td>{s.symbol}</td>
                  <td>{s.last_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </Widget.Content>

    </Widget>
  );
}