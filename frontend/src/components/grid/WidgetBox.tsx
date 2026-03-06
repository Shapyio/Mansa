/*
    Widget Box 

    This is a reuseable component used as the base for all other widgets.
*/
import { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export default function WidgetBox({ title, children }: Props) {
  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }}>
      <div className="widget-header" style={{
        padding: "0.5rem",
        background: "#f4f4f4",
        cursor: "move"
      }}>
        {title}
      </div>

      <div style={{ padding: "1rem", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}