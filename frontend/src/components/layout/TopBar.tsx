import { useState } from "react";

type Props = {
  toggleSidebar: () => void;
};

export default function TopBar({ toggleSidebar }: Props) {
  const [query, setQuery] = useState("");

  return (
    <div style={{
      height: "60px",
      display: "flex",
      alignItems: "center",
      background: "#232f3e",
      padding: "0 1rem"
    }}>
      <button onClick={toggleSidebar} style={{ marginRight: "1rem" }}>
        ☰
      </button>

      <input
        type="text"
        placeholder="Search models, stocks, tools..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "50%",
          padding: "0.5rem",
          borderRadius: "4px",
          border: "none"
        }}
      />
    </div>
  );
}