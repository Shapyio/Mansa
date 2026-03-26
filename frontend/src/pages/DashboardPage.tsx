import { useState } from "react"
import PageHeader from "../components/layout/PageHeader"
import DashboardGrid from "../components/grid/DashboardGrid"

export default function Dashboard() {

  const [editMode, setEditMode] = useState(false)

  return (
    <>

      <PageHeader
        title="Dashboard"
        actions={
          <button
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Save Layout" : "Edit Widgets"}
          </button>
        }
      />

      <DashboardGrid editMode={editMode} />

    </>
  )
}