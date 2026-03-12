import { useState } from "react";
import { Outlet } from "react-router-dom";

import Banner from "./Banner";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";

export default function AppLayout() {

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app">
      <Banner />
      <TopBar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="main">
        <Sidebar isOpen={sidebarOpen} />

        <div className="dashboard">
          <Outlet />
        </div>
      </div>
    </div>
  );
}