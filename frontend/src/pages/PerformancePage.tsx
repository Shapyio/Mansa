export default function Performance() {

  const metrics = {
    accuracy: "72%",
    sharpe: "1.45",
    drawdown: "-8%",
    trades: 142
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Model Performance</h1>

      <p>Overview of model metrics and training results.</p>

      <div style={{ marginTop: "20px" }}>
        <p><b>Accuracy:</b> {metrics.accuracy}</p>
        <p><b>Sharpe Ratio:</b> {metrics.sharpe}</p>
        <p><b>Max Drawdown:</b> {metrics.drawdown}</p>
        <p><b>Total Trades:</b> {metrics.trades}</p>
      </div>

      <div style={{ marginTop: "30px" }}>
        <p>Performance charts will appear here.</p>
      </div>
    </div>
  );
}