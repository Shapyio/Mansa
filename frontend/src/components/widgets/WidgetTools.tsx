import Widget from "../grid/Widget";
import { runJob } from "../../api/jobs";

export default function ToolsWidget() {

  async function trainModel() {
    const res = await runJob("train_model", { symbol: "AAPL" });
    console.log(res);
  }

  async function backtest() {
    await runJob("run_backtest", { symbol: "AAPL" });
  }

  return (
    <Widget>

      <Widget.Header>
        <span>Tools</span>

        <Widget.Controls>
          <button onClick={trainModel}>Train</button>
          <button onClick={backtest}>Backtest</button>
        </Widget.Controls>

      </Widget.Header>

      <Widget.Content>
        <p>Run model tools here.</p>
      </Widget.Content>

    </Widget>
  );
}