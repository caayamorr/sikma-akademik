import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Menu navigasi berbeda untuk tiap role (Role-Based Navigation) */
const MENU = {
  mahasiswa: [
    { to: "/dashboard/mhs", label: "Dashboard & KRS" },
  ],
  dosen: [
    { to: "/dashboard/dosen", label: "Dosen Wali & Pengampu" },
  ],
  kaprodi: [
    { to: "/dashboard/kaprodi", label: "Rekap & Review Prodi" },
  ],
  kajur: [
    { to: "/dashboard/kajur", label: "Audit & Persetujuan" },
  ],
  admin: [
    { to: "/dashboard/admin", label: "Manajemen Sistem" },
  ],
};

const LABEL_ROLE = {
  mahasiswa: "Mahasiswa",
  dosen: "Dosen",
  kaprodi: "Kaprodi",
  kajur: "Ketua Jurusan",
  admin: "Administrator",
};

export default function Layout() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  // Layout berada di luar ProtectedRoute, jadi harus aman saat user belum ada
  if (loading) return <div className="p-8 text-slate-500">Memuat sesi...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const menu = MENU[user.role] ?? [];

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-lg">SIKMA</div>
          <div className="flex items-center gap-4 text-sm">
            {/* user.nama dirender sebagai teks murni -> aman dari XSS */}
            <span>
              {user.nama} <span className="opacity-75">({LABEL_ROLE[user.role]})</span>
            </span>
            <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded">
              Keluar
            </button>
          </div>
        </div>
        <nav className="bg-blue-800">
          <div className="max-w-6xl mx-auto px-4 flex gap-1">
            {menu.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm ${isActive ? "bg-white text-blue-800 font-semibold" : "hover:bg-blue-700"}`
                }
              >
                {m.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4">
        <Outlet />
      </main>

      <footer className="text-center text-xs text-slate-500 py-3">SIKMA - Proyek Akhir Pra-UTS</footer>
    </div>
  );
}
