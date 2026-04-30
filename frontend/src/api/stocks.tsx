export interface StockRow {
  id: number;
  symbol: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  sector_id: number | null;
  industry_id: number | null;
  last_update: string | null;
  last_price: number | null;
  volume: number | null;
  prev_close: number | null;
  day_change_pct: number | null;
  metadata_updated_at: string | null;
}

export interface StockProfile extends StockRow {
  country: string | null;
  state: string | null;
  city: string | null;
  first_update: string | null;
  bar_count: number;
  high_all: number | null;
  low_all: number | null;
  hi_52w: number | null;
  lo_52w: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  employees: number | null;
}

export interface BarRow {
  timestamp: string;
  open: number; high: number; low: number; close: number;
  volume: number | null;
  trade_count: number | null;
  vwap: number | null;
}

export interface SectorRow   { id: number; name: string; company_count: number }
export interface IndustryRow { id: number; name: string; company_count: number }

async function jget<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const getStocks = (opts: {
  sector_id?: number; industry_id?: number; search?: string; limit?: number;
} = {}) => {
  const p = new URLSearchParams();
  if (opts.sector_id   != null) p.set("sector_id",   String(opts.sector_id));
  if (opts.industry_id != null) p.set("industry_id", String(opts.industry_id));
  if (opts.search)              p.set("search",      opts.search);
  if (opts.limit       != null) p.set("limit",       String(opts.limit));
  const qs = p.toString();
  return jget<StockRow[]>(`/api/stocks/${qs ? `?${qs}` : ""}`);
};

export const getStockProfile = (symbol: string) =>
  jget<StockProfile>(`/api/stocks/${encodeURIComponent(symbol)}/profile`);

export const getStockHistory = (symbol: string, start?: string, end?: string) => {
  const p = new URLSearchParams();
  if (start) p.set("start", start);
  if (end)   p.set("end",   end);
  const qs = p.toString();
  return jget<BarRow[]>(`/api/stocks/${encodeURIComponent(symbol)}/history${qs ? `?${qs}` : ""}`);
};

export const getSectors    = () => jget<SectorRow[]>("/api/stocks/sectors");
export const getIndustries = (sector_id?: number) =>
  jget<IndustryRow[]>(`/api/stocks/industries${sector_id != null ? `?sector_id=${sector_id}` : ""}`);
