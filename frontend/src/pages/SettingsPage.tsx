import { useState, useEffect } from "react";

export default function Settings() {

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    const theme = darkMode ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", theme);

    localStorage.setItem("theme", theme);
  }, [darkMode]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Settings</h1>

      <label>
        <input
          type="checkbox"
          checked={darkMode}
          onChange={() => setDarkMode(!darkMode)}
        />
        Dark Mode
      </label>

    </div>
  );
}