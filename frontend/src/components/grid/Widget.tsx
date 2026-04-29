import type { ReactNode } from "react";
import { IconClose, IconGrip } from "../ui/Icons";

type WidgetProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  controls?: ReactNode;
  editMode?: boolean;
  onRemove?: () => void;
  children?: ReactNode;
  /** padding override for the body */
  padded?: boolean;
};

/**
 * Card-style widget. The header acts as the drag handle in edit mode.
 * Use the `widget__no-drag` class on any interactive element inside the
 * header that should NOT trigger a drag (handled by DashboardGrid).
 */
export default function Widget({
  title, subtitle, controls, editMode, onRemove, children, padded = true,
}: WidgetProps) {
  return (
    <div
      className="widget"
      style={{
        height: "100%", display: "flex", flexDirection: "column",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        overflow: "hidden",
        transition: "border-color var(--dur-fast)",
      }}
    >
      <div
        className="widget__head"
        style={{
          display: "flex", alignItems: "center", gap: "var(--s-2)",
          padding: "10px 12px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg-1)",
          userSelect: "none",
        }}
      >
        {editMode && (
          <span style={{ color: "var(--text-faint)", display: "inline-flex" }}>
            <IconGrip size={14} />
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          {title && (
            <div style={{ fontSize: "var(--fs-md)", fontWeight: 500, color: "var(--text)" }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: 1 }}>
              {subtitle}
            </div>
          )}
        </div>
        {controls && <div className="widget__no-drag" style={{ display: "flex", gap: 6 }}>{controls}</div>}
        {editMode && onRemove && (
          <button
            className="icon-btn widget__no-drag"
            onClick={onRemove}
            aria-label="Remove widget"
            style={{ width: 24, height: 24 }}
          >
            <IconClose size={14} />
          </button>
        )}
      </div>
      <div style={{ padding: padded ? "var(--s-4)" : 0, flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
