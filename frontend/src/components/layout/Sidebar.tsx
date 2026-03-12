import { NavLink } from "react-router-dom";

export default function Sidebar({ isOpen }) {
  if (!isOpen) return null;

  return (
    <div className="sidebar">

      <div className="sidebar-main">

        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/tools">Tools</NavLink>
        <NavLink to="/performance">Performance</NavLink>
        <NavLink to="/news">News</NavLink>
        <NavLink to="/stocks">Stocks</NavLink>

      </div>

      <div className="sidebar-bottom">

        <NavLink to="/settings">Settings</NavLink>
        <NavLink to="/about">About</NavLink>

      </div>

    </div>
  );
}