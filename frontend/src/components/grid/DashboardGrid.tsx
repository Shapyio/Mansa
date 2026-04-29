import { useMemo, useState } from "react";
import { Responsive, type Layout } from "react-grid-layout";
import { WidthProvider } from "react-grid-layout/legacy";

import { useLocalStorage } from "../../hooks/useLocalStorage";
import { widgetRegistry, type WidgetId } from "../widgets/Registry";
import Button from "../ui/Button";
import { IconClose, IconPlus } from "../ui/Icons";

const ResponsiveGridLayout = WidthProvider(Responsive);

type Props = { editMode: boolean };

const DEFAULT_VISIBLE: WidgetId[] = ["stats", "stocks", "jobs", "performance"];
const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  stats:       { x: 0, y: 0 },
  stocks:      { x: 0, y: 3 },
  jobs:        { x: 6, y: 3 },
  performance: { x: 0, y: 9 },
  tools:       { x: 8, y: 0 },
};

const COLS = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

export default function DashboardGrid({ editMode }: Props) {
  const [visible, setVisible] = useLocalStorage<WidgetId[]>("dashboard.visible", DEFAULT_VISIBLE);
  const [layouts, setLayouts] = useLocalStorage<Record<string, Layout[]>>("dashboard.layouts", {});
  const [pickerOpen, setPickerOpen] = useState(false);

  const initialLayouts = useMemo(() => {
    if (layouts.lg && layouts.lg.length > 0) return layouts;
    const lg: Layout[] = visible.map((id) => {
      const w = widgetRegistry[id];
      const pos = DEFAULT_POSITIONS[id] ?? { x: 0, y: Infinity };
      return { i: id, x: pos.x, y: pos.y, ...w.defaultSize };
    });
    return { lg };
  }, [visible, layouts]);

  const remove = (id: WidgetId) => setVisible(visible.filter((v) => v !== id));
  const add    = (id: WidgetId) => {
    if (visible.includes(id)) return;
    setVisible([...visible, id]);
    setPickerOpen(false);
  };

  const hidden = (Object.keys(widgetRegistry) as WidgetId[]).filter((id) => !visible.includes(id));

  return (
    <>
      <ResponsiveGridLayout
        className={`dashboard-grid${editMode ? " dashboard-grid--edit" : ""}`}
        layouts={initialLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={COLS}
        rowHeight={72}
        margin={[16, 16]}
        containerPadding={[0, 0]}

        isDraggable={editMode}
        isResizable={editMode}

        draggableHandle=".widget__head"
        draggableCancel=".widget__no-drag"

        compactType="vertical"
        preventCollision={false}
        useCSSTransforms

        onLayoutChange={(_current, all) => setLayouts(all)}
      >
        {visible.map((id) => {
          const W = widgetRegistry[id].component;
          return (
            <div key={id}>
              <W editMode={editMode} onRemove={() => remove(id)} />
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {editMode && hidden.length > 0 && (
        <div style={{ marginTop: "var(--s-4)" }}>
          <Button variant="ghost" icon={<IconPlus />} onClick={() => setPickerOpen(true)}>
            Add Widget
          </Button>
        </div>
      )}

      {pickerOpen && (
        <div className="modal-overlay" onClick={() => setPickerOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s-4)" }}>
              <h3 style={{ fontSize: "var(--fs-lg)", fontWeight: 600 }}>Add Widget</h3>
              <button className="icon-btn" onClick={() => setPickerOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s-3)" }}>
              {hidden.map((id) => {
                const w = widgetRegistry[id];
                return (
                  <button
                    key={id}
                    onClick={() => add(id)}
                    className="surface"
                    style={{
                      padding: "var(--s-4)", textAlign: "left",
                      cursor: "pointer", color: "var(--text)",
                      transition: "border-color var(--dur-fast), background var(--dur-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-line)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                  >
                    <div style={{ fontSize: "var(--fs-md)", fontWeight: 500, marginBottom: 4 }}>{w.name}</div>
                    {w.description && (
                      <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                        {w.description}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
