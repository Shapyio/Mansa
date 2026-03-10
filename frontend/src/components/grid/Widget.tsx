/*
  Base widget container
  Layout only — no business logic

  Serves as design pattern for other widgets
*/

import React, { createContext, useContext, ReactNode } from "react";

type WidgetContextType = {};

const WidgetContext = createContext<WidgetContextType | null>(null);

export default function Widget({ children }: { children: ReactNode }) {
  return (
    <WidgetContext.Provider value={{}}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {children}
      </div>
    </WidgetContext.Provider>
  );
}

function Header({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "0.5rem",
        background: "#f4f4f4",
        cursor: "move",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      {children}
    </div>
  );
}

function Controls({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", gap: "0.5rem" }}>{children}</div>;
}

function Content({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: "1rem",
        flex: 1,
        overflowY: "auto"
      }}
    >
      {children}
    </div>
  );
}

Widget.Header = Header;
Widget.Controls = Controls;
Widget.Content = Content;