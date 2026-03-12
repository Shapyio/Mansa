import ToolsWidget from "./ToolsWidget";
import PerformanceWidget from "./PerformanceWidget";
import StocksTableWidget from "./StocksTableWidget";

export const widgetRegistry = {
  tools: {
    name: "Tools",
    component: ToolsWidget,
    defaultSize: { w: 3, h: 3 }
  },
  performance: {
    name: "Model Performance",
    component: PerformanceWidget,
    defaultSize: { w: 6, h: 4 }
  },
  stocks: {
    name: "Stocks Table",
    component: StocksTableWidget,
    defaultSize: { w: 5, h: 4 }
  }
};