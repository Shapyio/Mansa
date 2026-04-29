import type { ComponentType } from "react";

import JobsWidget        from "./JobsWidget";
import MarketStatsWidget from "./MarketStatsWidget";
import PerformanceWidget from "./PerformanceWidget";
import StocksTableWidget from "./StocksTableWidget";
import ToolsWidget       from "./ToolsWidget";

export type WidgetEditProps = { editMode?: boolean; onRemove?: () => void };

type WidgetDef = {
  name: string;
  description?: string;
  component: ComponentType<WidgetEditProps>;
  defaultSize: { w: number; h: number; minW?: number; minH?: number };
};

export const widgetRegistry = {
  stats: {
    name: "Market Stats",
    description: "Top-of-dashboard KPI cards.",
    component: MarketStatsWidget,
    defaultSize: { w: 12, h: 3, minW: 4, minH: 2 },
  },
  stocks: {
    name: "Stocks Table",
    description: "Live prices + sortable, searchable table.",
    component: StocksTableWidget,
    defaultSize: { w: 6, h: 6, minW: 4, minH: 4 },
  },
  jobs: {
    name: "Jobs Queue",
    description: "Live job statuses + queue depth.",
    component: JobsWidget,
    defaultSize: { w: 6, h: 6, minW: 4, minH: 4 },
  },
  performance: {
    name: "Model Performance",
    description: "Accuracy, Sharpe, drawdown.",
    component: PerformanceWidget,
    defaultSize: { w: 8, h: 4, minW: 4, minH: 3 },
  },
  tools: {
    name: "Quick Tools",
    description: "One-click checks and actions.",
    component: ToolsWidget,
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
  },
} satisfies Record<string, WidgetDef>;

export type WidgetId = keyof typeof widgetRegistry;
