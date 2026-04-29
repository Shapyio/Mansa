import Widget from "../grid/Widget";
import Stat from "../ui/Stat";
import type { WidgetEditProps } from "./Registry";

export default function PerformanceWidget({ editMode, onRemove }: WidgetEditProps) {
  const m = { accuracy: "—", sharpe: "—", drawdown: "—", trades: 0 };

  return (
    <Widget
      title="Model Performance"
      subtitle="Latest training run"
      editMode={editMode} onRemove={onRemove}
      padded={false}
    >
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "var(--s-3)",
        padding: "var(--s-3)",
      }}>
        <Stat label="Accuracy" value={m.accuracy} />
        <Stat label="Sharpe"   value={m.sharpe} />
        <Stat label="Drawdown" value={m.drawdown} />
        <Stat label="Trades"   value={m.trades} />
      </div>
      <div style={{
        margin: "0 var(--s-3) var(--s-3)",
        padding: "var(--s-6)",
        border: "1px dashed var(--line)",
        borderRadius: "var(--r-md)",
        textAlign: "center", color: "var(--text-faint)",
        fontSize: "var(--fs-sm)",
      }}>
        Equity curve will render here once a model is trained.
      </div>
    </Widget>
  );
}
