import { useState } from "react";
import TopBar from "../components/layout/TopBar";
import Sidebar from "../components/layout/Sidebar";
import DashboardGrid from "../components/grid/DashboardGrid";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <h1 />
      <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ flex: 1, display: "flex" }}>
        <Sidebar isOpen={sidebarOpen} />
        <div style={{ flex: 1, padding: "1rem" }}>
          <DashboardGrid />
        </div>
      </div>
    </div>
  );
}