import { Routes, Route } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import Dashboard from "./pages/DashboardPage";
import Stocks from "./pages/StocksPage";
import Tools from "./pages/ToolsPage";
import Performance from "./pages/PerformancePage";
import News from "./pages/NewsPage";
import Settings from "./pages/SettingsPage";
import About from "./pages/AboutPage";

export default function App() {
  return (
      <Routes>

        <Route element={<AppLayout />}>

          <Route path="/" element={<Dashboard />} />
          <Route path="/stocks" element={<Stocks />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/news" element={<News />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />

        </Route>

      </Routes>
  );
}