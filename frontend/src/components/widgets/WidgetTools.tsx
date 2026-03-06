import WidgetBox from "../grid/WidgetBox";

export default function ToolsWidget() {
  return (
    <WidgetBox title="Tools">
      <button>Train Model</button>
      <button>Backtest</button>
      <button>Deploy</button>
    </WidgetBox>
  );
}