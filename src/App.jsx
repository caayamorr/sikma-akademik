import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { HOME_BY_ROLE, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import DashboardMhs from "./pages/mahasiswa/DashboardMhs";
import DashboardDosen from "./pages/dosen/DashboardDosen";
import DashboardKaprodi from "./pages/kaprodi/DashboardKaprodi";
import DashboardKajur from "./pages/kajur/DashboardKajur";
import DashboardAdmin from "./pages/admin/DashboardAdmin";

/** "/" -> arahkan ke dashboard sesuai role, atau ke login jika belum masuk */
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-8 text-slate-500">Memuat...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role] ?? "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Semua halaman di bawah ini memakai Layout (header + menu per role) */}
      <Route element={<Layout />}>
        <Route
          path="/dashboard/mhs"
          element={
            <ProtectedRoute allowedRoles={["mahasiswa"]}>
              <DashboardMhs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/dosen"
          element={
            <ProtectedRoute allowedRoles={["dosen"]}>
              <DashboardDosen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/kaprodi"
          element={
            <ProtectedRoute allowedRoles={["kaprodi"]}>
              <DashboardKaprodi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/kajur"
          element={
            <ProtectedRoute allowedRoles={["kajur"]}>
              <DashboardKajur />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardAdmin />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<div className="p-8 text-slate-700">404 - Halaman tidak ditemukan</div>} />
    </Routes>
  );
}
