import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

export default function DashboardGrid() {
  const layout = [
    { i: "tools", x: 0, y: 0, w: 3, h: 3 },
    { i: "performance", x: 3, y: 0, w: 6, h: 4 },
    { i: "news", x: 0, y: 3, w: 4, h: 4 },
    { i: "stocks", x: 4, y: 4, w: 5, h: 4 }
  ];

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={12}
      rowHeight={80}
      width={1200}
      draggableHandle=".widget-header"
      >
    </GridLayout>
  );
}