import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon?:  ReactNode;
};

export default function Stat({ label, value, delta, icon }: Props) {
  const dColor = delta?.direction === "up" ? "var(--up)" :
                 delta?.direction === "down" ? "var(--down)" : "var(--text-muted)";
  return (
    <div className="stat">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="stat__label">{label}</span>
        {icon && <span style={{ color: "var(--text-muted)" }}>{icon}</span>}
      </div>
      <span className="stat__value tabular">{value}</span>
      {delta && (
        <span className="stat__delta tabular" style={{ color: dColor }}>
          {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "—"} {delta.value}
        </span>
      )}
    </div>
  );
}
