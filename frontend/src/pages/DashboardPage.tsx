import { useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import DashboardGrid from "../components/grid/DashboardGrid";
import Button from "../components/ui/Button";
import { IconCheck, IconRefresh, IconTools } from "../components/ui/Icons";

export default function Dashboard() {
  const [editMode, setEditMode] = useState(false);

  const reset = () => {
    if (!confirm("Reset dashboard layout to defaults?")) return;
    localStorage.removeItem("dashboard.visible");
    localStorage.removeItem("dashboard.layouts");
    location.reload();
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Drag the header to move · drag the corner to resize · click + to add"
        actions={
          <>
            {editMode && (
              <Button variant="ghost" icon={<IconRefresh />} onClick={reset}>
                Reset
              </Button>
            )}
            <Button
              variant={editMode ? "primary" : "default"}
              icon={editMode ? <IconCheck /> : <IconTools />}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "Done" : "Edit"}
            </Button>
          </>
        }
      />
      <DashboardGrid editMode={editMode} />
    </>
  );
}
