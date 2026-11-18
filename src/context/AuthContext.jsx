import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

/**
 * AuthContext menyimpan data user di MEMORI (state React), bukan localStorage.
 * Token sesi ada di cookie HttpOnly yang tidak bisa dibaca JavaScript.
 *
 * Saat halaman di-refresh, state hilang -> kita tanya backend (/auth/me)
 * "siapa saya?" memakai cookie yang masih ada. Itu sebabnya ada status `loading`.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pulihkan sesi saat aplikasi pertama dibuka
  useEffect(() => {
    let batal = false;
    api
      .get("/auth/me")
      .then((res) => {
        if (!batal) setUser(res.data.user ?? res.data);
      })
      .catch(() => {
        if (!batal) setUser(null);
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });
    return () => {
      batal = true;
    };
  }, []);

  // Jika interceptor menangkap 401 di mana pun -> otomatis logout
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("sikma:unauthorized", handler);
    return () => window.removeEventListener("sikma:unauthorized", handler);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    const u = res.data.user ?? res.data;
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}

/** Peta role -> halaman utama (sesuai tabel di modul) */
export const HOME_BY_ROLE = {
  mahasiswa: "/dashboard/mhs",
  dosen: "/dashboard/dosen",
  kaprodi: "/dashboard/kaprodi",
  kajur: "/dashboard/kajur",
  admin: "/dashboard/admin",
};
