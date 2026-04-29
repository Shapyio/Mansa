import { NavLink } from "react-router-dom";
import {
  IconAbout, IconBolt, IconDashboard, IconNews,
  IconPerformance, IconSettings, IconStocks, IconTools,
} from "../ui/Icons";

type NavItem = { to: string; label: string; icon: React.ReactNode };

const top: NavItem[] = [
  { to: "/",            label: "Dashboard",   icon: <IconDashboard /> },
  { to: "/stocks",      label: "Stocks",      icon: <IconStocks /> },
  { to: "/performance", label: "Performance", icon: <IconPerformance /> },
  { to: "/tools",       label: "Tools",       icon: <IconTools /> },
  { to: "/news",        label: "News",        icon: <IconNews /> },
];
const bottom: NavItem[] = [
  { to: "/settings", label: "Settings", icon: <IconSettings /> },
  { to: "/about",    label: "About",    icon: <IconAbout /> },
];

type Props = { collapsed: boolean };

export default function Sidebar({ collapsed }: Props) {
  const w = collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)";
  return (
    <aside
      className="app__sidebar"
      style={{
        width: w,
        background: "var(--bg-1)",
        borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column",
        padding: "var(--s-4) var(--s-3)",
        transition: "width var(--dur) var(--ease)",
        overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 var(--s-2)", marginBottom: "var(--s-6)",
        height: 32, color: "var(--text)",
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, var(--accent), #34d399)",
          display: "grid", placeItems: "center", color: "#04130d", flexShrink: 0,
        }}>
          <IconBolt size={16} />
        </span>
        {!collapsed && (
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
            Mansa
          </span>
        )}
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {top.map((item) => <NavRow key={item.to} {...item} collapsed={collapsed} />)}
      </nav>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        {bottom.map((item) => <NavRow key={item.to} {...item} collapsed={collapsed} />)}
      </div>
    </aside>
  );
}

function NavRow({ to, label, icon, collapsed }: NavItem & { collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      title={collapsed ? label : undefined}
      className={({ isActive }) => `nav-row${isActive ? " nav-row--active" : ""}`}
      style={({ isActive }) => ({
        display: "flex", alignItems: "center", gap: 12,
        padding: "8px 10px",
        borderRadius: 8,
        color: isActive ? "var(--text)" : "var(--text-muted)",
        background: isActive ? "var(--bg-2)" : "transparent",
        fontSize: "var(--fs-md)", fontWeight: isActive ? 500 : 400,
        position: "relative",
        transition: "background var(--dur-fast), color var(--dur-fast)",
      })}
    >
      <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}
