import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./LoginPage";
import ProtectedRoute from "./ProtectedRoute";

import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import AdminPage from "./AdminPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/farmer"
          element={
            <ProtectedRoute>
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
