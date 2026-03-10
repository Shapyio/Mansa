export async function getStocks() {
  const res = await fetch(`/api/stocks/`);

  if (!res.ok) {
    throw new Error("Failed to fetch stocks");
  }

  return res.json();
}

export async function getStockHistory(symbol: string, start: string, end: string) {
  const res = await fetch(
    `/api/stocks/${symbol}/history?start=${start}&end=${end}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch stock history");
  }

  return res.json();
}