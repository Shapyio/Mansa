import { Responsive } from "react-grid-layout";
import { WidthProvider } from "react-grid-layout/legacy";
import { widgetRegistry } from "../widgets/Registry";

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardGrid() {
  // Build layouts from the registry's defaultSize + a stored x/y position
  const positions: Record<string, { x: number; y: number }> = {
    tools:       { x: 0, y: 0 },
    performance: { x: 3, y: 0 },
    stocks:      { x: 9, y: 0 },
  };

  const layouts = {
    lg: Object.entries(widgetRegistry).map(([id, widget]) => ({
      i: id,
      x: positions[id]?.x ?? 0,
      y: positions[id]?.y ?? 0,
      ...widget.defaultSize,
    })),
  };

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}

      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={80}

      isDraggable={true}
      isResizable={false}

      draggableHandle=".widget-header"
      draggableCancel=".widget-controls" // Make sure widget controls are clickable, not draggable

      measureBeforeMount={false}
      useCSSTransforms={false}
      compactType="vertical"
      preventCollision={false}
      isDroppable={false}
      transformScale={1}
      isBounded={true}
    >
      {Object.entries(widgetRegistry).map(([id, widget]) => {
        const WidgetComponent = widget.component;
        return (
          <div key={id}>
            <WidgetComponent />
          </div>
        );
      })}
    </ResponsiveGridLayout>
  );
}