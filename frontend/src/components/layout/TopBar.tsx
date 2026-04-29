import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { IconBell, IconMenu, IconMoon, IconSearch, IconSun } from "../ui/Icons";

type Props = { onToggleSidebar: () => void };

export default function TopBar({ onToggleSidebar }: Props) {
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useTheme();

  return (
    <header
      className="app__topbar"
      style={{
        display: "flex", alignItems: "center", gap: "var(--s-3)",
        padding: "0 var(--s-5)",
        borderBottom: "1px solid var(--line)",
        background: "var(--bg-0)",
      }}
    >
      <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <IconMenu />
      </button>

      <div style={{ position: "relative", flex: "0 1 420px" }}>
        <span style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          color: "var(--text-faint)", display: "inline-flex",
        }}>
          <IconSearch />
        </span>
        <input
          className="input"
          placeholder="Search stocks, jobs, models..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 34 }}
        />
        <kbd style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          fontSize: "var(--fs-xs)", color: "var(--text-faint)",
          padding: "1px 6px", border: "1px solid var(--line)", borderRadius: 4,
          background: "var(--bg-1)",
        }}>⌘K</kbd>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--s-2)" }}>
        <span className="badge badge--up" title="API healthy">
          <span className="dot" style={{ background: "var(--up)" }} /> live
        </span>
        <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === "dark" ? <IconSun /> : <IconMoon />}
        </button>
        <button className="icon-btn" aria-label="Notifications"><IconBell /></button>
        <div style={{
          width: 30, height: 30, borderRadius: 999,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          color: "white", display: "grid", placeItems: "center",
          fontSize: 12, fontWeight: 600,
        }}>S</div>
      </div>
    </header>
  );
}
