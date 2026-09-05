import { useState } from "react";
import StaffDashboard from "./pages/staff/StaffDashboard";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  const [view, setView] = useState("staff");

  return (
    <div>
      <div
        style={{
          padding: "10px",
          background: "#f8fafc",
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <button
          onClick={() => setView("farmer")}
          style={{
            padding: "8px 16px",
            fontWeight: view === "farmer" ? "bold" : "normal",
            cursor: "pointer",
            background: view === "farmer" ? "#e2e8f0" : "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
          }}
        >
          Farmer View
        </button>

        <button
          onClick={() => setView("staff")}
          style={{
            padding: "8px 16px",
            fontWeight: view === "staff" ? "bold" : "normal",
            cursor: "pointer",
            background: view === "staff" ? "#e2e8f0" : "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
          }}
        >
          Staff View
        </button>

        <button
          onClick={() => setView("admin")}
          style={{
            padding: "8px 16px",
            fontWeight: view === "admin" ? "bold" : "normal",
            cursor: "pointer",
            background: view === "admin" ? "#e2e8f0" : "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
          }}
        >
          Admin View
        </button>
      </div>

      {view === "staff" && <StaffDashboard />}
      {view === "farmer" && <FarmerDashboard />}
      {view === "admin" && <AdminDashboard />}
    </div>
  );
}

export default App;