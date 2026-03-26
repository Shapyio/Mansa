import { runJob } from "../api/jobs";
import PageHeader from "../components/layout/PageHeader"

export default function Tools() {

  async function trainModel() {
    const res = await runJob("train_model", { symbol: "AAPL" });
    console.log(res);
  }

  async function backtest() {
    const res = await runJob("run_backtest", { symbol: "AAPL" });
    console.log(res);
  }

  return (
    <>
    <PageHeader title="Tools" />
    <div style={{ padding: "20px" }}>

      <p>Run backend jobs for models and analysis.</p>

      <div style={{ marginTop: "20px" }}>
        <button onClick={trainModel} style={{ marginRight: "10px" }}>
          Train Model
        </button>

        <button onClick={backtest}>
          Run Backtest
        </button>
      </div>

      <div style={{ marginTop: "30px" }}>
        <p>Job results and logs will appear here.</p>
      </div>
    </div>
    </>
  );
}