import { Responsive } from "react-grid-layout";
import { WidthProvider } from "react-grid-layout/legacy";

import ToolsWidget from "../widgets/ToolsWidget";
import PerformanceWidget from "../widgets/PerformanceWidget";
import StocksTableWidget from "../widgets/StocksTableWidget";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {

  const layouts = {
    lg: [
      { i: "tools", x: 0, y: 0, w: 3, h: 3 },
      { i: "performance", x: 3, y: 0, w: 6, h: 4 },
      { i: "stocks", x: 9, y: 0, w: 3, h: 4 }
    ]
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}

      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 10, sm: 6 }}

      rowHeight={80}

      draggableHandle=".widget-header"

      measureBeforeMount={false}
      useCSSTransforms={true}

      compactType="vertical"
      preventCollision={false}

      transformScale={1} // Fix widget drag offset
      isBounded={true} // Fix widgets leaving screen view
    >

      <div key="stocks"><StocksTableWidget /></div>
      <div key="tools"><ToolsWidget /></div>
      <div key="performance"><PerformanceWidget /></div>

    </ResponsiveGridLayout>
  );
}