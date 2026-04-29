import PageHeader from "../components/layout/PageHeader";
import Stat from "../components/ui/Stat";
import { IconPerformance } from "../components/ui/Icons";

export default function Performance() {
  const m = { accuracy: "—", sharpe: "—", drawdown: "—", trades: 0 };

  return (
    <>
      <PageHeader title="Performance" subtitle="Model accuracy, returns, and risk metrics" />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "var(--s-3)",
        marginBottom: "var(--s-5)",
      }}>
        <Stat label="Accuracy"     value={m.accuracy} icon={<IconPerformance />} />
        <Stat label="Sharpe Ratio" value={m.sharpe} />
        <Stat label="Max Drawdown" value={m.drawdown} />
        <Stat label="Total Trades" value={m.trades} />
      </div>

      <div className="card card--padded" style={{
        textAlign: "center", padding: "var(--s-10)",
        color: "var(--text-faint)", fontSize: "var(--fs-sm)",
      }}>
        Equity curve and per-symbol breakdown will appear here once a model has been trained.
      </div>
    </>
  );
}
