import { useState, useEffect } from "react";
import PageHeader from "../components/layout/PageHeader"

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
    <>
    <PageHeader title="Settings" />
    <div style={{ padding: "20px" }}>

      <label>
        <input
          type="checkbox"
          checked={darkMode}
          onChange={() => setDarkMode(!darkMode)}
        />
        Dark Mode
      </label>

    </div>
    </>
  );
}