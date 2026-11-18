import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Proteksi hak akses rute sisi klien (sesuai pedoman modul).
 *
 * 1. Belum login          -> redirect ke /login
 * 2. Login tapi role salah -> tampilkan 403
 * 3. Lolos                 -> render halaman
 *
 * CATATAN PENTING: ini hanya lapisan UX. Keamanan sebenarnya tetap ada di backend
 * (Dimas) yang memverifikasi role di setiap endpoint. Pengguna nakal bisa
 * memodifikasi kode klien, tetapi tidak bisa melewati pengecekan server.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Tunggu pemulihan sesi dulu supaya tidak "terpental" ke login saat refresh
  if (loading) {
    return <div className="p-8 text-slate-500">Memuat sesi...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 text-red-600 font-bold">403 - Akses Ditolak untuk Role Anda</div>
    );
  }

  return children;
}
