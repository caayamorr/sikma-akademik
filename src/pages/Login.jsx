import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { HOME_BY_ROLE, useAuth } from "../context/AuthContext";
import Alert from "../components/ErrorAlert";
import { bersihkanTeks } from "../utils/sanitize";
import { validasiLogin } from "../utils/validators";

export default function Login() {
  const { login, isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [pesan, setPesan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to={HOME_BY_ROLE[user.role] ?? "/"} replace />;
  }

  function onChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setPesan("");

    // 1) Sanitasi + validasi di sisi klien
    const bersih = { username: bersihkanTeks(form.username), password: form.password };
    const v = validasiLogin(bersih);
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    // 2) Kirim ke backend; error ditampilkan lewat pesan ramah (bukan detail teknis)
    setSubmitting(true);
    try {
      const u = await login(bersih.username, bersih.password);
      navigate(HOME_BY_ROLE[u.role] ?? "/", { replace: true });
    } catch (err) {
      // Untuk login, pesan sengaja generik agar tidak membocorkan "username ada / tidak"
      // [MODUL VI] Kecuali: akun terkunci (423/429) dan password kedaluwarsa punya pesan khusus
      const status = err.response?.status;
      const kode = err.response?.data?.code;
      if (kode === "PASSWORD_EXPIRED") {
        setPesan("Password Anda sudah kedaluwarsa. Hubungi administrator untuk menggantinya.");
      } else {
        setPesan(status === 401 || status === 400 ? "Username atau password salah." : err.userMessage);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 p-4">
      <form onSubmit={onSubmit} noValidate className="bg-white rounded-xl shadow-xl w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-blue-800 text-center">SIKMA</h1>
        <p className="text-center text-sm text-slate-500 mb-6">
          Sistem Informasi Kuliah & Manajemen Akademik
        </p>

        <Alert type="error" pesan={pesan} />

        <label className="block text-sm font-medium mb-1" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          className="input"
          value={form.username}
          onChange={onChange}
          maxLength={50}
        />
        {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}

        <label className="block text-sm font-medium mb-1 mt-4" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="input"
          value={form.password}
          onChange={onChange}
          maxLength={100}
        />
        {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full mt-6 py-2">
          {submitting ? "Memproses..." : "Masuk"}
        </button>

        {import.meta.env.VITE_USE_MOCK === "true" && (
          <p className="text-xs text-slate-500 mt-4 text-center">
            Mode demo: mhs / dosen / kaprodi / kajur / admin — password: password123
          </p>
        )}
      </form>
    </div>
  );
}
