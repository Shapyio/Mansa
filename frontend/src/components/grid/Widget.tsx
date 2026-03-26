import React, { ReactNode } from "react";

type WidgetProps = {
  children: ReactNode;
};

export default function Widget({ children }: WidgetProps) {
  return (
    <div className="widget">
      {children}
    </div>
  );
}

function Header({ children }: { children: ReactNode }) {
  return (
    <div className="widget-header">
      {children}
    </div>
  );
}

function Controls({ children }: { children: ReactNode }) {
  return (
    <div className="widget-controls">
      {children}
    </div>
  );
}

function Content({ children }: { children: ReactNode }) {
  return (
    <div className="widget-content">
      {children}
    </div>
  );
}

Widget.Header = Header;
Widget.Controls = Controls;
Widget.Content = Content;