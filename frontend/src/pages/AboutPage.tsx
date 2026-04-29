import PageHeader from "../components/layout/PageHeader";

export default function About() {
  return (
    <>
      <PageHeader title="About Mansa" subtitle="What this is, and what's under the hood" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--s-4)" }}>
        <Card title="Mission">
          A stock analysis and AI modeling dashboard. Ingest market data, train models,
          monitor jobs, and visualize results — all in one workspace.
        </Card>
        <Card title="Features">
          <ul style={{ paddingLeft: 18, lineHeight: 1.7, color: "var(--text-muted)" }}>
            <li>OHLCV ingestion via Alpaca</li>
            <li>Background jobs with RQ + audit trail</li>
            <li>Model training & backtesting</li>
            <li>Drag-and-drop dashboard widgets</li>
            <li>News + sentiment (planned)</li>
          </ul>
        </Card>
        <Card title="Stack">
          <ul style={{ paddingLeft: 18, lineHeight: 1.7, color: "var(--text-muted)" }}>
            <li>React + Vite + TypeScript</li>
            <li>FastAPI (Python 3.11)</li>
            <li>Redis + RQ workers</li>
            <li>PostgreSQL / TimescaleDB</li>
            <li>Docker Compose</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card card--padded">
      <div style={{ fontSize: "var(--fs-lg)", fontWeight: 600, marginBottom: "var(--s-3)" }}>{title}</div>
      <div style={{ color: "var(--text)", fontSize: "var(--fs-sm)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
