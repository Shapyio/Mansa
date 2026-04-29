import { Outlet } from "react-router-dom";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useLocalStorage<boolean>("sidebar.collapsed", false);

  return (
    <div className="app">
      <Sidebar collapsed={collapsed} />
      <TopBar onToggleSidebar={() => setCollapsed(!collapsed)} />
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  );
}
