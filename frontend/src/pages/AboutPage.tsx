import PageHeader from "../components/layout/PageHeader"

export default function About() {
  return (
    <>
    <PageHeader title="Stocks" />
    <div style={{ padding: "20px" }}>

      <p>
        This platform is a stock analysis and AI modeling dashboard designed to
        ingest financial data, run models, and visualize results.
      </p>

      <h2>Features</h2>

      <ul>
        <li>Stock market data ingestion</li>
        <li>Machine learning model training</li>
        <li>Backtesting tools</li>
        <li>Interactive dashboards</li>
        <li>News sentiment analysis</li>
      </ul>

      <h2>Tech Stack</h2>

      <ul>
        <li>React + Vite frontend</li>
        <li>FastAPI backend</li>
        <li>Python workers</li>
        <li>PostgreSQL / TimescaleDB</li>
        <li>Docker containerized architecture</li>
      </ul>
    </div>
    </>
  );
}