# Kodingan Lengkap SIKMA Frontend (Oca) - RBAC 5 Role

Buat file sesuai nama path di tiap judul, lalu salin isinya. Jalankan: npm install lalu npm run dev
Mode demo tanpa backend: VITE_USE_MOCK=true npm run dev (login mhs / dosen / kaprodi / kajur / admin, password password123)

## package.json

```json
{
  "name": "sikma-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "dompurify": "^3.1.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.0"
  }
}
```

## vite.config.js

```jsx
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy ke backend (Dimas) supaya cookie HttpOnly dianggap same-site saat development
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

## tailwind.config.js

```jsx
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

## postcss.config.js

```jsx
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

## index.html

```html
<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SIKMA - Sistem Informasi Kuliah & Manajemen Akademik</title>
  </head>
  <body class="bg-slate-50">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## deploy/express-static.example.js

```jsx
/**
 * ALTERNATIF TANPA NGINX: Express menyajikan folder dist/ sekaligus API.
 * Ini CONTOH potongan untuk backend (Dimas), bukan bagian dari frontend.
 * Taruh dua blok static di PALING BAWAH, setelah semua rute /api.
 */
const path = require("path");
const express = require("express");
const app = express();

// ... middleware (helmet, cookie-parser, express.json) dan semua rute /api/... di atas ...

// 1) Sajikan file hasil build (npm run build -> dist/)
app.use(express.static(path.join(__dirname, "dist")));

// 2) Fallback SPA: selain /api, kembalikan index.html
//    (agar refresh di /dashboard/mhs dll tidak 404)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Backend internal: dengarkan hanya di localhost jika di belakang Nginx
app.listen(3000, "127.0.0.1");
```

## deploy/nginx.conf

```nginx
# ============================================================
# SIKMA - Konfigurasi Nginx (Lapisan 1: Frontend + reverse proxy)
# Sesuai diagram: Nginx melayani port 80/443, backend Express
# berjalan internal di port 3000 (tidak dibuka ke publik).
#
# Cara pakai (di server):
#   1) npm run build           -> menghasilkan folder dist/
#   2) salin isi dist/ ke /var/www/sikma/dist
#   3) salin file ini ke /etc/nginx/conf.d/sikma.conf
#   4) sudo nginx -t && sudo systemctl reload nginx
# ============================================================

server {
    listen 80;
    server_name _;                     # ganti dengan IP / domain, mis. 192.168.1.50

    root /var/www/sikma/dist;
    index index.html;

    # --- Header keamanan (lapisan tambahan anti-XSS / clickjacking) ---
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer" always;
    # 'unsafe-inline' hanya untuk style (grafik batang Kajur memakai style inline).
    # Skrip tetap hanya dari origin sendiri.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" always;

    # --- Semua permintaan /api diteruskan ke backend Express (port 3000) ---
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        # Jika rute backend TIDAK berawalan /api, ganti baris di atas menjadi:
        #   proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Fallback SPA: wajib agar refresh di /dashboard/mhs dll tidak 404 ---
    location / {
        try_files $uri $uri/ /index.html;
    }

    # File hasil build (nama berhash) boleh di-cache lama
    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}

# --- Untuk HTTPS (port 443) tambahkan blok server kedua dengan ssl_certificate,
#     lalu aktifkan flag 'Secure' pada cookie di backend. ---
```

## src/App.jsx

```jsx
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
```

## src/api/client.js

```jsx
import axios from "axios";

/**
 * Axios instance tunggal untuk seluruh aplikasi.
 *
 * withCredentials: true -> browser otomatis mengirim cookie HttpOnly (token sesi).
 * Token TIDAK disimpan di localStorage, sehingga skrip XSS tidak bisa mencurinya.
 */
axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 15000,
});

/**
 * Ubah error teknis menjadi pesan ramah pengguna.
 * Pesan mentah dari server / basis data (stack trace, SQL error, dll)
 * TIDAK pernah ditampilkan ke layar.
 */
export function pesanErrorRamah(error) {
  if (!error.response) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
  }
  switch (error.response.status) {
    case 400:
    case 422:
      return "Data yang Anda kirim belum valid. Periksa kembali isian formulir.";
    case 401:
      return "Sesi Anda berakhir. Silakan login kembali.";
    case 403:
      return "Anda tidak memiliki izin untuk melakukan aksi ini.";
    case 404:
      return "Data yang diminta tidak ditemukan.";
    case 409:
      return "Aksi ditolak karena data sudah berubah atau terkunci.";
    // [MODUL VI] Akun terkunci setelah gagal login berulang (FAILED_LOGIN_ATTEMPTS / PASSWORD_LOCK_TIME)
    case 423:
      return "Akun dikunci sementara karena terlalu banyak percobaan login yang gagal. Coba lagi beberapa saat lagi.";
    case 429:
      return "Terlalu banyak percobaan. Akun atau alamat Anda dibatasi sementara, coba lagi beberapa saat lagi.";
    default:
      return "Terjadi kesalahan pada sistem. Silakan coba lagi nanti.";
  }
}

/**
 * Interceptor respons: seragamkan error.
 * - 401 -> sesi habis, kirim event agar AuthContext logout & redirect ke /login
 * - error.userMessage -> selalu aman untuk ditampilkan
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = pesanErrorRamah(error);

    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("sikma:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
```

## src/api/mock.js

```jsx
import api from "./client";

/**
 * MOCK BACKEND (hanya untuk demo / screenshot laporan)
 * Aktif jika dijalankan dengan:  VITE_USE_MOCK=true npm run dev
 * Mengganti adapter axios sehingga tidak ada request jaringan sungguhan.
 * Saat backend Dimas siap, cukup jalankan tanpa variabel itu.
 *
 * Mengikuti RBAC 5 role laporan: admin, mahasiswa, dosen, kaprodi, kajur.
 */

const USERS = {
  mhs: { id: 1, username: "mhs", nama: "Budi Santoso", role: "mahasiswa" },
  dosen: { id: 2, username: "dosen", nama: "Dr. Ani Wijaya", role: "dosen" },
  kaprodi: { id: 6, username: "kaprodi", nama: "Dr. Sari Lestari", role: "kaprodi" },
  kajur: { id: 3, username: "kajur", nama: "Prof. Hendra Kusuma", role: "kajur" },
  admin: { id: 4, username: "admin", nama: "Administrator", role: "admin" },
};

let sesi = null; // user yang sedang login (simulasi cookie)

const db = {
  mk: [
    { id: 1, kode: "IF101", nama: "Pemrograman Web", sks: 3 },
    { id: 2, kode: "IF102", nama: "Basis Data", sks: 3 },
    { id: 3, kode: "IF103", nama: "Keamanan Informasi", sks: 3 },
    { id: 4, kode: "IF104", nama: "Jaringan Komputer", sks: 4 },
    { id: 5, kode: "IF105", nama: "Interaksi Manusia & Komputer", sks: 2 },
  ],
  kelas: [
    { id: 1, mata_kuliah_id: 1, kode: "IF101", nama: "Pemrograman Web", sks: 3, dosen_id: 2, dosen_nama: "Dr. Ani Wijaya", jadwal: "Senin 08:00", kuota: 40 },
    { id: 2, mata_kuliah_id: 2, kode: "IF102", nama: "Basis Data", sks: 3, dosen_id: 2, dosen_nama: "Dr. Ani Wijaya", jadwal: "Selasa 10:00", kuota: 40 },
    { id: 3, mata_kuliah_id: 3, kode: "IF103", nama: "Keamanan Informasi", sks: 3, dosen_id: 5, dosen_nama: "Ir. Rudi Hartono", jadwal: "Rabu 13:00", kuota: 35 },
    { id: 4, mata_kuliah_id: 4, kode: "IF104", nama: "Jaringan Komputer", sks: 4, dosen_id: 5, dosen_nama: "Ir. Rudi Hartono", jadwal: "Kamis 08:00", kuota: 35 },
    { id: 5, mata_kuliah_id: 5, kode: "IF105", nama: "Interaksi Manusia & Komputer", sks: 2, dosen_id: null, dosen_nama: null, jadwal: "Jumat 09:00", kuota: 30 },
  ],
  // Status KRS: draft -> submitted -> approved
  krs: { status: "draft", kelas_ids: [] },
  khs: [
    { kode: "IF001", nama: "Algoritma", sks: 3, nilai_huruf: "A", nilai_angka: 88 },
    { kode: "IF002", nama: "Struktur Data", sks: 3, nilai_huruf: "B", nilai_angka: 78 },
    { kode: "IF003", nama: "Matematika Diskrit", sks: 3, nilai_huruf: "B", nilai_angka: 75 },
  ],
  wali: [
    { id: 11, nim: "2021001", nama: "Budi Santoso", total_sks: 21, status_krs: "submitted" },
    // Payload XSS untuk demo: harus tampil sebagai TEKS, bukan tereksekusi
    { id: 12, nim: "2021002", nama: "<script>alert(1)</script>", total_sks: 18, status_krs: "submitted" },
    { id: 13, nim: "2021003", nama: "Citra Lestari", total_sks: 20, status_krs: "approved" },
    { id: 14, nim: "2021004", nama: "Dewi Anggraini", total_sks: 0, status_krs: "draft" },
  ],
  nilai: {
    1: [
      { id: 101, nama_mahasiswa: "Budi Santoso", nilai_angka: 85, status_kunci: false },
      { id: 102, nama_mahasiswa: "<img src=x onerror=alert(1)>", nilai_angka: 70, status_kunci: false },
      { id: 103, nama_mahasiswa: "Citra Lestari", nilai_angka: 92, status_kunci: false },
    ],
    2: [
      { id: 201, nama_mahasiswa: "Budi Santoso", nilai_angka: 80, status_kunci: true },
      { id: 202, nama_mahasiswa: "Citra Lestari", nilai_angka: 88, status_kunci: true },
    ],
    3: [{ id: 301, nama_mahasiswa: "Eko Prasetyo", nilai_angka: 65, status_kunci: true }],
  },
  // Alur: menunggu_review (Kaprodi) -> direkomendasikan (Kajur) -> disetujui_kajur (Admin eksekusi) -> dieksekusi
  tiket: [
    { id: 1, kelas: "IF102 Basis Data", mahasiswa: "Budi Santoso", nilai_id: 201, nilai_lama: 80, nilai_baru: 85, alasan: "Salah input pada komponen UAS.", status: "menunggu_review" },
    { id: 2, kelas: "IF102 Basis Data", mahasiswa: "<b>Citra</b>", nilai_id: 202, nilai_lama: 88, nilai_baru: 90, alasan: "<script>alert('xss')</script> Revisi.", status: "menunggu_review" },
    { id: 3, kelas: "IF101 Pemrograman Web", mahasiswa: "Dewi Anggraini", nilai_id: 103, nilai_lama: 72, nilai_baru: 75, alasan: "Tugas akhir belum terhitung.", status: "direkomendasikan" },
    { id: 4, kelas: "IF103 Keamanan Informasi", mahasiswa: "Eko Prasetyo", nilai_id: 301, nilai_lama: 65, nilai_baru: 70, alasan: "Nilai praktikum belum masuk.", status: "disetujui_kajur" },
  ],
  users: [
    { id: 1, username: "mhs", nama: "Budi Santoso", role: "mahasiswa" },
    { id: 2, username: "dosen", nama: "Dr. Ani Wijaya", role: "dosen" },
    { id: 3, username: "kajur", nama: "Prof. Hendra Kusuma", role: "kajur" },
    { id: 4, username: "admin", nama: "Administrator", role: "admin" },
    { id: 5, username: "rudi", nama: "Ir. Rudi Hartono", role: "dosen" },
    { id: 6, username: "kaprodi", nama: "Dr. Sari Lestari", role: "kaprodi" },
  ],
  periode: { mulai: "2026-11-01", selesai: "2026-11-30", aktif: true },
};

const ok = (config, data, status = 200) =>
  Promise.resolve({ data, status, statusText: "OK", headers: {}, config });
const gagal = (config, status, message = "error") =>
  Promise.reject(
    Object.assign(new Error(message), { config, response: { status, data: { message }, config, headers: {} } })
  );

function handle(config) {
  const method = (config.method || "get").toLowerCase();
  const url = config.url.replace(/^\/api/, "");
  const body = config.data ? JSON.parse(config.data) : {};
  let m;

  // --- Auth ---
  if (method === "post" && url === "/auth/login") {
    const u = USERS[body.username];
    if (!u || body.password !== "password123") return gagal(config, 401);
    sesi = u;
    return ok(config, { user: u });
  }
  if (method === "get" && url === "/auth/me") return sesi ? ok(config, { user: sesi }) : gagal(config, 401);
  if (method === "post" && url === "/auth/logout") {
    sesi = null;
    return ok(config, {});
  }
  if (!sesi) return gagal(config, 401);

  const butuhRole = (r) => (sesi.role === r ? null : gagal(config, 403));

  // --- Mahasiswa ---
  if (url.startsWith("/mahasiswa")) {
    const denied = butuhRole("mahasiswa");
    if (denied) return denied;
    if (method === "get" && url === "/mahasiswa/kelas") return ok(config, { periode: db.periode, kelas: db.kelas });
    if (method === "get" && url === "/mahasiswa/krs") return ok(config, db.krs);
    if (method === "post" && url === "/mahasiswa/krs") {
      if (db.krs.status !== "draft") return gagal(config, 409); // sudah submitted/approved: tidak bisa diubah
      if (!db.periode.aktif) return gagal(config, 409);
      db.krs = { status: body.submit ? "submitted" : "draft", kelas_ids: body.kelas_ids };
      return ok(config, db.krs);
    }
    if (method === "get" && url === "/mahasiswa/khs") return ok(config, db.khs);
  }

  // --- Dosen (Wali + Pengampu; dibedakan secara kontekstual lewat dosen_wali_id / dosen_id) ---
  if (url.startsWith("/dosen")) {
    const denied = butuhRole("dosen");
    if (denied) return denied;
    if (method === "get" && url === "/dosen/wali/mahasiswa") return ok(config, db.wali);
    if ((m = url.match(/^\/dosen\/wali\/krs\/(\d+)\/acc$/)) && method === "post") {
      const mhs = db.wali.find((x) => x.id === +m[1]);
      if (!mhs) return gagal(config, 404);
      if (mhs.status_krs !== "submitted") return gagal(config, 409);
      mhs.status_krs = "approved";
      return ok(config, mhs);
    }
    if (method === "get" && url === "/dosen/pengampu/kelas")
      return ok(
        config,
        db.kelas
          .filter((k) => k.dosen_id === sesi.id)
          .map((k) => ({ ...k, terkunci: (db.nilai[k.id] || []).every((n) => n.status_kunci) && !!db.nilai[k.id] }))
      );
    if ((m = url.match(/^\/dosen\/pengampu\/kelas\/(\d+)\/nilai$/)) && method === "get")
      return ok(config, db.nilai[+m[1]] || []);
    if ((m = url.match(/^\/dosen\/nilai\/(\d+)$/)) && method === "put") {
      for (const list of Object.values(db.nilai)) {
        const row = list.find((n) => n.id === +m[1]);
        if (row) {
          if (row.status_kunci) return gagal(config, 409);
          row.nilai_angka = body.nilai_angka;
          return ok(config, row);
        }
      }
      return gagal(config, 404);
    }
    // Pengajuan koreksi nilai terkunci -> tiket berstatus menunggu_review (Kaprodi)
    if (method === "post" && url === "/dosen/koreksi") {
      for (const [kelasId, list] of Object.entries(db.nilai)) {
        const row = list.find((n) => n.id === body.nilai_id);
        if (!row) continue;
        if (!row.status_kunci) return gagal(config, 409); // nilai belum dikunci: ubah langsung, bukan lewat tiket
        if (db.tiket.some((t) => t.nilai_id === row.id && ["menunggu_review", "direkomendasikan", "disetujui_kajur"].includes(t.status)))
          return gagal(config, 409); // sudah ada tiket aktif
        const k = db.kelas.find((x) => x.id === +kelasId);
        const baru = {
          id: Date.now(), kelas: `${k.kode} ${k.nama}`, mahasiswa: row.nama_mahasiswa, nilai_id: row.id,
          nilai_lama: row.nilai_angka, nilai_baru: body.nilai_baru, alasan: body.alasan, status: "menunggu_review",
        };
        db.tiket.push(baru);
        return ok(config, baru, 201);
      }
      return gagal(config, 404);
    }
    if ((m = url.match(/^\/dosen\/pengampu\/kelas\/(\d+)\/kunci$/)) && method === "post") {
      (db.nilai[+m[1]] || []).forEach((n) => (n.status_kunci = true));
      return ok(config, {});
    }
  }

  // --- Kaprodi: rekap tingkat prodi + review awal eskalasi ---
  if (url.startsWith("/kaprodi")) {
    const denied = butuhRole("kaprodi");
    if (denied) return denied;
    if (method === "get" && url === "/kaprodi/rekap")
      return ok(config, {
        prodi: "D4 Rekayasa Keamanan Siber",
        total_mahasiswa: 120,
        rata_ipk: 3.18,
        distribusi_nilai: { A: 30, B: 52, C: 28, D: 8, E: 2 },
        perwalian: { draft: 14, submitted: 22, approved: 84 },
        beban_mengajar: [
          { dosen: "Dr. Ani Wijaya", jumlah_kelas: 2, total_sks: 6 },
          { dosen: "Ir. Rudi Hartono", jumlah_kelas: 2, total_sks: 7 },
        ],
      });
    if (method === "get" && url === "/kaprodi/tiket") return ok(config, db.tiket);
    if ((m = url.match(/^\/kaprodi\/tiket\/(\d+)\/review$/)) && method === "post") {
      const t = db.tiket.find((x) => x.id === +m[1]);
      if (!t) return gagal(config, 404);
      if (t.status !== "menunggu_review") return gagal(config, 409);
      t.status = body.rekomendasi ? "direkomendasikan" : "ditolak";
      return ok(config, t);
    }
  }

  // --- Kajur: audit makro + persetujuan tertinggi ---
  if (url.startsWith("/kajur")) {
    const denied = butuhRole("kajur");
    if (denied) return denied;
    if (method === "get" && url === "/kajur/statistik")
      return ok(config, {
        tingkat_kelulusan: 87.5,
        total_mahasiswa: 240,
        rata_ipk: 3.21,
        distribusi_nilai: { A: 62, B: 98, C: 54, D: 18, E: 8 },
        prodi: [
          { nama: "D4 Rekayasa Keamanan Siber", mahasiswa: 120, rata_ipk: 3.18, kelulusan: 86.0 },
          { nama: "D3 Teknik Informatika", mahasiswa: 80, rata_ipk: 3.25, kelulusan: 90.0 },
          { nama: "D4 Bisnis Digital", mahasiswa: 40, rata_ipk: 3.22, kelulusan: 87.0 },
        ],
      });
    if (method === "get" && url === "/kajur/tiket") return ok(config, db.tiket);
    if ((m = url.match(/^\/kajur\/tiket\/(\d+)\/keputusan$/)) && method === "post") {
      const t = db.tiket.find((x) => x.id === +m[1]);
      if (!t) return gagal(config, 404);
      if (t.status !== "direkomendasikan") return gagal(config, 409); // harus lewat rekomendasi Kaprodi
      t.status = body.setuju ? "disetujui_kajur" : "ditolak";
      return ok(config, t);
    }
  }

  // --- Admin ---
  if (url.startsWith("/admin")) {
    const denied = butuhRole("admin");
    if (denied) return denied;
    if (method === "get" && url === "/admin/users") return ok(config, db.users);
    if (method === "post" && url === "/admin/users") {
      if (db.users.some((u) => u.username === body.username)) return gagal(config, 409);
      const baru = { id: Date.now(), username: body.username, nama: body.nama, role: body.role };
      db.users.push(baru);
      return ok(config, baru, 201);
    }
    if (method === "get" && url === "/admin/mata-kuliah") return ok(config, db.mk);
    if (method === "post" && url === "/admin/mata-kuliah") {
      if (db.mk.some((x) => x.kode === body.kode)) return gagal(config, 409);
      const baru = { id: Date.now(), kode: body.kode, nama: body.nama, sks: body.sks };
      db.mk.push(baru);
      return ok(config, baru, 201);
    }
    if (method === "get" && url === "/admin/kelas") return ok(config, db.kelas);
    if (method === "post" && url === "/admin/kelas") {
      const mkRow = db.mk.find((x) => x.id === body.mata_kuliah_id);
      if (!mkRow) return gagal(config, 404);
      const baru = {
        id: Date.now(), mata_kuliah_id: mkRow.id, kode: mkRow.kode, nama: mkRow.nama, sks: mkRow.sks,
        dosen_id: null, dosen_nama: null, jadwal: body.jadwal, kuota: body.kuota,
      };
      db.kelas.push(baru);
      return ok(config, baru, 201);
    }
    if ((m = url.match(/^\/admin\/kelas\/(\d+)\/dosen$/)) && method === "put") {
      const k = db.kelas.find((x) => x.id === +m[1]);
      const d = db.users.find((x) => x.id === +body.dosen_id && x.role === "dosen");
      if (!k || !d) return gagal(config, 404);
      k.dosen_id = d.id;
      k.dosen_nama = d.nama;
      return ok(config, k);
    }
    // Eksekusi teknis buka kunci: hanya untuk tiket yang sudah disetujui Kajur
    if (method === "get" && url === "/admin/tiket")
      return ok(config, db.tiket.filter((t) => ["disetujui_kajur", "dieksekusi"].includes(t.status)));
    if ((m = url.match(/^\/admin\/tiket\/(\d+)\/eksekusi$/)) && method === "post") {
      const t = db.tiket.find((x) => x.id === +m[1]);
      if (!t) return gagal(config, 404);
      if (t.status !== "disetujui_kajur") return gagal(config, 409);
      for (const list of Object.values(db.nilai)) {
        const row = list.find((n) => n.id === t.nilai_id);
        if (row) row.status_kunci = false;
      }
      t.status = "dieksekusi";
      return ok(config, t);
    }
    if (method === "get" && url === "/admin/krs-periode") return ok(config, db.periode);
    if (method === "put" && url === "/admin/krs-periode") {
      db.periode = { ...db.periode, ...body };
      return ok(config, db.periode);
    }
  }

  return gagal(config, 404);
}

export function aktifkanMockJikaDiminta() {
  if (import.meta.env.VITE_USE_MOCK !== "true") return;
  api.defaults.adapter = (config) => new Promise((res) => setTimeout(() => res(handle(config)), 250)).then((r) => r);
}
```

## src/components/ErrorAlert.jsx

```jsx
/**
 * Kotak pesan error/sukses. Pesan dirender sebagai teks biasa ({pesan}),
 * jadi aman dari XSS walau isinya berasal dari server.
 */
export default function Alert({ type = "error", pesan }) {
  if (!pesan) return null;
  const gaya =
    type === "error"
      ? "bg-red-50 border-red-300 text-red-800"
      : type === "success"
      ? "bg-green-50 border-green-300 text-green-800"
      : "bg-blue-50 border-blue-300 text-blue-800";
  return (
    <div role="alert" className={`border rounded px-4 py-2 text-sm mb-4 ${gaya}`}>
      {pesan}
    </div>
  );
}
```

## src/components/GradeInputRow.jsx

```jsx
import { useState } from "react";
import { bersihkanTeks } from "../utils/sanitize";
import { validasiKoreksi, validasiNilai } from "../utils/validators";

/**
 * Baris input nilai dengan indikator kunci (State Lock) - sesuai laporan RBAC.
 *
 * Belum dikunci (status_kunci = false):
 *  - Dosen Pengampu boleh input / ubah nilai ("Simpan Draf").
 * Sudah dikunci (status_kunci = true):
 *  - input dinonaktifkan, tampil badge "Terkunci Permanen".
 *  - perubahan HANYA lewat tiket eskalasi: Dosen mengajukan koreksi, lalu
 *    Kaprodi (review awal) -> Kajur (final approval) -> Admin (eksekusi buka kunci).
 * Ini hanya membantu UX; backend tetap WAJIB menolak perubahan pada nilai terkunci
 * dan mengecek kelas.dosen_id = user.id.
 *
 * item.nama_mahasiswa dirender sebagai teks murni -> payload XSS tampil sebagai teks.
 */
export default function GradeInputRow({ item, onSave, onKoreksi }) {
  const isLocked = item.status_kunci === true;
  const [nilai, setNilai] = useState(item.nilai_angka ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form pengajuan koreksi (hanya untuk nilai terkunci)
  const [bukaKoreksi, setBukaKoreksi] = useState(false);
  const [nilaiBaru, setNilaiBaru] = useState("");
  const [alasan, setAlasan] = useState("");
  const [errKoreksi, setErrKoreksi] = useState({});

  async function simpan() {
    const err = validasiNilai(nilai);
    setError(err);
    if (err) return;
    setSaving(true);
    try {
      await onSave(item, Number(nilai));
    } finally {
      setSaving(false);
    }
  }

  async function kirimKoreksi() {
    const alasanBersih = bersihkanTeks(alasan);
    const v = validasiKoreksi(nilaiBaru, alasanBersih);
    setErrKoreksi(v);
    if (Object.keys(v).length > 0) return;
    setSaving(true);
    try {
      const berhasil = await onKoreksi(item, Number(nilaiBaru), alasanBersih);
      if (berhasil) {
        setBukaKoreksi(false);
        setNilaiBaru("");
        setAlasan("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr className={isLocked ? "bg-slate-100 opacity-80" : ""}>
        <td className="td">{item.nama_mahasiswa}</td>
        <td className="td">
          <input
            type="number"
            min={0}
            max={100}
            value={nilai}
            onChange={(e) => setNilai(e.target.value)}
            disabled={isLocked}
            aria-label={`Nilai ${item.nama_mahasiswa}`}
            className="border p-1 w-24 rounded disabled:bg-slate-200"
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </td>
        <td className="td">
          {isLocked ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">
                Terkunci Permanen
              </span>
              {onKoreksi && (
                <button className="btn-secondary text-xs" onClick={() => setBukaKoreksi((b) => !b)}>
                  {bukaKoreksi ? "Batal" : "Ajukan Koreksi"}
                </button>
              )}
            </div>
          ) : (
            <button className="btn-primary text-xs" onClick={simpan} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Draf"}
            </button>
          )}
        </td>
      </tr>

      {isLocked && bukaKoreksi && (
        <tr className="bg-yellow-50">
          <td className="td" colSpan={3}>
            <p className="text-sm font-semibold mb-2">
              Ajukan Koreksi Nilai (eskalasi ke Kaprodi, lalu Kajur, lalu Admin)
            </p>
            <div className="flex flex-wrap gap-3 items-start">
              <div>
                <label className="block text-xs mb-1" htmlFor={`nb-${item.id}`}>Nilai baru (0-100)</label>
                <input
                  id={`nb-${item.id}`}
                  type="number"
                  min={0}
                  max={100}
                  value={nilaiBaru}
                  onChange={(e) => setNilaiBaru(e.target.value)}
                  className="border p-1 w-28 rounded"
                />
                {errKoreksi.nilai && <p className="text-xs text-red-600 mt-1">{errKoreksi.nilai}</p>}
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs mb-1" htmlFor={`al-${item.id}`}>Alasan revisi</label>
                <textarea
                  id={`al-${item.id}`}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="border p-1 w-full rounded"
                />
                {errKoreksi.alasan && <p className="text-xs text-red-600 mt-1">{errKoreksi.alasan}</p>}
              </div>
              <button className="btn-primary text-xs mt-5" onClick={kirimKoreksi} disabled={saving}>
                {saving ? "Mengirim..." : "Kirim Tiket"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

## src/components/Layout.jsx

```jsx
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
```

## src/components/ProtectedRoute.jsx

```jsx
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
```

## src/components/StatusTiket.jsx

```jsx
/**
 * Alur tiket eskalasi buka kunci nilai (sesuai RBAC laporan):
 *   menunggu_review  -> Kaprodi: review awal & rekomendasi
 *   direkomendasikan -> Kajur  : persetujuan tertinggi (Final Approval)
 *   disetujui_kajur  -> Admin  : eksekusi teknis buka kunci (status_kunci = FALSE)
 *   dieksekusi       -> selesai
 *   ditolak          -> ditolak di salah satu tahap
 */
export const STATUS_TIKET = {
  menunggu_review: { teks: "Menunggu Review Kaprodi", gaya: "bg-yellow-100 text-yellow-800" },
  direkomendasikan: { teks: "Menunggu Persetujuan Kajur", gaya: "bg-blue-100 text-blue-800" },
  disetujui_kajur: { teks: "Disetujui, Menunggu Eksekusi Admin", gaya: "bg-indigo-100 text-indigo-800" },
  dieksekusi: { teks: "Kunci Sudah Dibuka", gaya: "bg-green-100 text-green-800" },
  ditolak: { teks: "Ditolak", gaya: "bg-red-100 text-red-800" },
};

export default function StatusTiket({ status }) {
  const s = STATUS_TIKET[status] ?? { teks: "Tidak diketahui", gaya: "bg-slate-200 text-slate-700" };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${s.gaya}`}>{s.teks}</span>;
}
```

## src/context/AuthContext.jsx

```jsx
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
```

## src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700
      disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors;
  }
  .btn-danger {
    @apply bg-red-600 text-white px-3 py-1.5 rounded font-medium hover:bg-red-700
      disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors;
  }
  .btn-secondary {
    @apply bg-slate-200 text-slate-800 px-3 py-1.5 rounded font-medium hover:bg-slate-300 transition-colors;
  }
  .card {
    @apply bg-white rounded-lg shadow p-5;
  }
  .input {
    @apply border border-slate-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400;
  }
  .th {
    @apply text-left px-3 py-2 bg-slate-100 text-slate-700 text-sm font-semibold;
  }
  .td {
    @apply px-3 py-2 border-t border-slate-200 text-sm;
  }
}
```

## src/main.jsx

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { aktifkanMockJikaDiminta } from "./api/mock";
import "./index.css";

// Mode demo tanpa backend (untuk screenshot laporan): jalankan dengan VITE_USE_MOCK=true
aktifkanMockJikaDiminta();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

## src/pages/Login.jsx

```jsx
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
```

## src/pages/admin/DashboardAdmin.jsx

```jsx
import { useEffect, useState } from "react";
import api from "../../api/client";
import Alert from "../../components/ErrorAlert";
import StatusTiket from "../../components/StatusTiket";
import { bersihkanTeks } from "../../utils/sanitize";
import {
  ROLES,
  cekAturanPassword,
  kekuatanPassword,
  validasiAkun,
  validasiKelas,
  validasiMataKuliah,
} from "../../utils/validators";

const FORM_AKUN = { username: "", nama: "", role: "mahasiswa", password: "" };
const FORM_MK = { kode: "", nama: "", sks: 3 };
const FORM_KELAS = { mata_kuliah_id: "", jadwal: "", kuota: 40 };
const LABEL_ROLE = { admin: "Admin", mahasiswa: "Mahasiswa", dosen: "Dosen", kaprodi: "Kaprodi", kajur: "Kajur" };

/**
 * Dashboard Admin (RBAC laporan):
 *  users, mata_kuliah, kelas: CRUD penuh (akun civitas, master kurikulum, buka kelas)
 *  krs_detail: hanya update status_kunci, yaitu EKSEKUSI teknis buka kunci setelah Final Approval Kajur.
 * Admin DILARANG mengubah nilai mahasiswa sepihak: tidak ada form nilai di halaman ini.
 */
export default function DashboardAdmin() {
  const [users, setUsers] = useState([]);
  const [mk, setMk] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [tiket, setTiket] = useState([]);
  const [periode, setPeriode] = useState(null);
  const [formAkun, setFormAkun] = useState(FORM_AKUN);
  const [formMk, setFormMk] = useState(FORM_MK);
  const [formKelas, setFormKelas] = useState(FORM_KELAS);
  const [errAkun, setErrAkun] = useState({});
  const [errMk, setErrMk] = useState({});
  const [errKelas, setErrKelas] = useState({});
  const [pesan, setPesan] = useState({ type: "error", teks: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/users"),
      api.get("/admin/mata-kuliah"),
      api.get("/admin/kelas"),
      api.get("/admin/tiket"),
      api.get("/admin/krs-periode"),
    ])
      .then(([u, m, k, t, p]) => {
        setUsers(u.data);
        setMk(m.data);
        setKelas(k.data);
        setTiket(t.data);
        setPeriode(p.data);
      })
      .catch((e) => setPesan({ type: "error", teks: e.userMessage }))
      .finally(() => setLoading(false));
  }, []);

  const daftarDosen = users.filter((u) => u.role === "dosen");
  const ok = (teks) => setPesan({ type: "success", teks });
  const gagal = (e) => setPesan({ type: "error", teks: e.userMessage });

  /* ---- Manajemen akun (5 role) ---- */
  async function tambahAkun(e) {
    e.preventDefault();
    const bersih = {
      username: bersihkanTeks(formAkun.username),
      nama: bersihkanTeks(formAkun.nama),
      role: formAkun.role,
      password: formAkun.password,
    };
    const v = validasiAkun(bersih);
    setErrAkun(v);
    if (Object.keys(v).length) return;
    try {
      const res = await api.post("/admin/users", bersih);
      setUsers((u) => [...u, res.data]);
      setFormAkun(FORM_AKUN);
      ok("Akun berhasil dibuat.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Master kurikulum (mata kuliah) ---- */
  async function tambahMk(e) {
    e.preventDefault();
    const bersih = { kode: bersihkanTeks(formMk.kode).toUpperCase(), nama: bersihkanTeks(formMk.nama), sks: Number(formMk.sks) };
    const v = validasiMataKuliah(bersih);
    setErrMk(v);
    if (Object.keys(v).length) return;
    try {
      const res = await api.post("/admin/mata-kuliah", bersih);
      setMk((m) => [...m, res.data]);
      setFormMk(FORM_MK);
      ok("Mata kuliah ditambahkan ke master kurikulum.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Pembukaan kelas ---- */
  async function bukaKelas(e) {
    e.preventDefault();
    const bersih = {
      mata_kuliah_id: Number(formKelas.mata_kuliah_id),
      jadwal: bersihkanTeks(formKelas.jadwal),
      kuota: Number(formKelas.kuota),
    };
    const v = validasiKelas(bersih);
    setErrKelas(v);
    if (Object.keys(v).length) return;
    try {
      const res = await api.post("/admin/kelas", bersih);
      setKelas((k) => [...k, res.data]);
      setFormKelas(FORM_KELAS);
      ok("Kelas berhasil dibuka. Tugaskan dosen pengampu di tabel kelas.");
    } catch (err) {
      gagal(err);
    }
  }

  async function tugaskan(kelasId, dosenId) {
    if (!dosenId) return;
    try {
      const res = await api.put(`/admin/kelas/${kelasId}/dosen`, { dosen_id: Number(dosenId) });
      setKelas((list) => list.map((k) => (k.id === kelasId ? res.data : k)));
      ok("Dosen pengampu berhasil ditugaskan.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Eksekusi teknis buka kunci nilai (pasca Final Approval Kajur) ---- */
  async function eksekusi(t) {
    if (!window.confirm("Eksekusi pembukaan kunci nilai ini? Tindakan tercatat di audit log.")) return;
    try {
      await api.post(`/admin/tiket/${t.id}/eksekusi`);
      setTiket((list) => list.map((x) => (x.id === t.id ? { ...x, status: "dieksekusi" } : x)));
      ok("Kunci nilai dibuka. Dosen pengampu kini dapat mengoreksi nilai.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Masa aktif KRS ---- */
  async function simpanPeriode(e) {
    e.preventDefault();
    if (periode.mulai && periode.selesai && periode.mulai > periode.selesai) {
      return setPesan({ type: "error", teks: "Tanggal mulai tidak boleh setelah tanggal selesai." });
    }
    try {
      const res = await api.put("/admin/krs-periode", periode);
      setPeriode(res.data);
      ok("Pengaturan masa KRS disimpan.");
    } catch (err) {
      gagal(err);
    }
  }

  if (loading) return <p className="text-slate-500">Memuat data...</p>;

  const kuat = kekuatanPassword(formAkun.password);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard Administrator</h2>
      <Alert type={pesan.type} pesan={pesan.teks} />

      {/* Eksekusi buka kunci nilai */}
      <section className="card overflow-x-auto">
        <h3 className="font-semibold mb-1">Eksekusi Teknis Buka Kunci Nilai</h3>
        <p className="text-sm text-slate-500 mb-3">
          Hanya tiket yang sudah disetujui Kajur yang dapat dieksekusi. Admin tidak dapat mengubah nilai mahasiswa sepihak.
        </p>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Kelas</th>
              <th className="th">Mahasiswa</th>
              <th className="th">Revisi</th>
              <th className="th">Status</th>
              <th className="th">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tiket.map((t) => (
              <tr key={t.id}>
                <td className="td">{t.kelas}</td>
                <td className="td">{t.mahasiswa}</td>
                <td className="td">{t.nilai_lama} → {t.nilai_baru}</td>
                <td className="td"><StatusTiket status={t.status} /></td>
                <td className="td">
                  <button className="btn-danger text-xs" disabled={t.status !== "disetujui_kajur"} onClick={() => eksekusi(t)}>
                    Buka Kunci
                  </button>
                </td>
              </tr>
            ))}
            {tiket.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={5}>Tidak ada tiket yang perlu dieksekusi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Master kurikulum */}
      <section className="card">
        <h3 className="font-semibold mb-3">Master Kurikulum (Mata Kuliah)</h3>
        <form onSubmit={tambahMk} noValidate className="grid sm:grid-cols-4 gap-3 items-start mb-4">
          <div>
            <input className="input" placeholder="Kode (mis. IF106)" value={formMk.kode} onChange={(e) => setFormMk({ ...formMk, kode: e.target.value })} aria-label="Kode mata kuliah" />
            {errMk.kode && <p className="text-xs text-red-600 mt-1">{errMk.kode}</p>}
          </div>
          <div>
            <input className="input" placeholder="Nama mata kuliah" value={formMk.nama} onChange={(e) => setFormMk({ ...formMk, nama: e.target.value })} aria-label="Nama mata kuliah" />
            {errMk.nama && <p className="text-xs text-red-600 mt-1">{errMk.nama}</p>}
          </div>
          <div>
            <input className="input" type="number" min={1} max={6} value={formMk.sks} onChange={(e) => setFormMk({ ...formMk, sks: e.target.value })} aria-label="SKS" />
            {errMk.sks && <p className="text-xs text-red-600 mt-1">{errMk.sks}</p>}
          </div>
          <button className="btn-primary py-2" type="submit">Tambah Mata Kuliah</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Kode</th>
                <th className="th">Mata Kuliah</th>
                <th className="th">SKS</th>
              </tr>
            </thead>
            <tbody>
              {mk.map((m) => (
                <tr key={m.id}>
                  <td className="td">{m.kode}</td>
                  <td className="td">{m.nama}</td>
                  <td className="td">{m.sks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Buka kelas + penugasan dosen */}
      <section className="card">
        <h3 className="font-semibold mb-3">Pembukaan Kelas & Penugasan Dosen</h3>
        <form onSubmit={bukaKelas} noValidate className="grid sm:grid-cols-4 gap-3 items-start mb-4">
          <div>
            <select className="input" value={formKelas.mata_kuliah_id} onChange={(e) => setFormKelas({ ...formKelas, mata_kuliah_id: e.target.value })} aria-label="Mata kuliah">
              <option value="">-- pilih mata kuliah --</option>
              {mk.map((m) => (
                <option key={m.id} value={m.id}>{m.kode} - {m.nama}</option>
              ))}
            </select>
            {errKelas.mata_kuliah_id && <p className="text-xs text-red-600 mt-1">{errKelas.mata_kuliah_id}</p>}
          </div>
          <div>
            <input className="input" placeholder="Jadwal (mis. Senin 08:00)" value={formKelas.jadwal} onChange={(e) => setFormKelas({ ...formKelas, jadwal: e.target.value })} aria-label="Jadwal" />
            {errKelas.jadwal && <p className="text-xs text-red-600 mt-1">{errKelas.jadwal}</p>}
          </div>
          <div>
            <input className="input" type="number" min={1} max={200} value={formKelas.kuota} onChange={(e) => setFormKelas({ ...formKelas, kuota: e.target.value })} aria-label="Kuota" />
            {errKelas.kuota && <p className="text-xs text-red-600 mt-1">{errKelas.kuota}</p>}
          </div>
          <button className="btn-primary py-2" type="submit">Buka Kelas</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Kode</th>
                <th className="th">Mata Kuliah</th>
                <th className="th">Jadwal</th>
                <th className="th">Kuota</th>
                <th className="th">Dosen Pengampu</th>
                <th className="th">Ganti Dosen</th>
              </tr>
            </thead>
            <tbody>
              {kelas.map((k) => (
                <tr key={k.id}>
                  <td className="td">{k.kode}</td>
                  <td className="td">{k.nama}</td>
                  <td className="td">{k.jadwal}</td>
                  <td className="td">{k.kuota}</td>
                  <td className="td">{k.dosen_nama ?? <em className="text-slate-400">Belum ditugaskan</em>}</td>
                  <td className="td">
                    <select className="border rounded px-2 py-1" value="" onChange={(e) => tugaskan(k.id, e.target.value)} aria-label={`Pilih dosen untuk ${k.nama}`}>
                      <option value="">-- pilih dosen --</option>
                      {daftarDosen.map((d) => (
                        <option key={d.id} value={d.id}>{d.nama}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manajemen akun */}
      <section className="card">
        <h3 className="font-semibold mb-3">Manajemen Akun Civitas (5 Role)</h3>
        <form onSubmit={tambahAkun} noValidate className="grid sm:grid-cols-5 gap-3 items-start mb-5">
          <div>
            <input className="input" placeholder="Username" value={formAkun.username} onChange={(e) => setFormAkun({ ...formAkun, username: e.target.value })} aria-label="Username" />
            {errAkun.username && <p className="text-xs text-red-600 mt-1">{errAkun.username}</p>}
          </div>
          <div>
            <input className="input" placeholder="Nama lengkap" value={formAkun.nama} onChange={(e) => setFormAkun({ ...formAkun, nama: e.target.value })} aria-label="Nama lengkap" />
            {errAkun.nama && <p className="text-xs text-red-600 mt-1">{errAkun.nama}</p>}
          </div>
          <div>
            <select className="input" value={formAkun.role} onChange={(e) => setFormAkun({ ...formAkun, role: e.target.value })} aria-label="Role">
              {ROLES.map((r) => (
                <option key={r} value={r}>{LABEL_ROLE[r]}</option>
              ))}
            </select>
            {errAkun.role && <p className="text-xs text-red-600 mt-1">{errAkun.role}</p>}
          </div>
          <div>
            <input className="input" type="password" placeholder="Password (kuat)" value={formAkun.password} onChange={(e) => setFormAkun({ ...formAkun, password: e.target.value })} autoComplete="new-password" aria-label="Password" />
            {/* [MODUL VI] Indikator kekuatan + daftar aturan password policy */}
            {formAkun.password && (
              <div className="mt-2" aria-live="polite">
                <div className="h-1.5 bg-slate-200 rounded">
                  <div className={`h-1.5 rounded ${kuat.warna}`} style={{ width: kuat.lebar }} />
                </div>
                <p className="text-xs mt-1">Kekuatan: <strong>{kuat.teks}</strong></p>
                <ul className="text-xs mt-1 space-y-0.5">
                  {cekAturanPassword(formAkun.password).map((a) => (
                    <li key={a.label} className={a.ok ? "text-green-700" : "text-slate-500"}>
                      {a.ok ? "✓" : "○"} {a.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {errAkun.password && <p className="text-xs text-red-600 mt-1">{errAkun.password}</p>}
          </div>
          <button className="btn-primary py-2" type="submit">Tambah Akun</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Username</th>
                <th className="th">Nama</th>
                <th className="th">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="td">{u.username}</td>
                  <td className="td">{u.nama}</td>
                  <td className="td">{LABEL_ROLE[u.role] ?? u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Masa aktif KRS */}
      {periode && (
        <section className="card">
          <h3 className="font-semibold mb-3">Pengaturan Masa Aktif Pengisian KRS</h3>
          <form onSubmit={simpanPeriode} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="mulai">Mulai</label>
              <input id="mulai" type="date" className="input" value={periode.mulai} onChange={(e) => setPeriode({ ...periode, mulai: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="selesai">Selesai</label>
              <input id="selesai" type="date" className="input" value={periode.selesai} onChange={(e) => setPeriode({ ...periode, selesai: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={periode.aktif} onChange={(e) => setPeriode({ ...periode, aktif: e.target.checked })} />
              Pengisian KRS aktif
            </label>
            <button className="btn-primary" type="submit">Simpan</button>
          </form>
        </section>
      )}
    </div>
  );
}
```

## src/pages/dosen/DashboardDosen.jsx

```jsx
import { useEffect, useState } from "react";
import api from "../../api/client";
import Alert from "../../components/ErrorAlert";
import GradeInputRow from "../../components/GradeInputRow";

// Status KRS sesuai laporan: draft -> submitted -> approved
const STATUS_KRS = {
  submitted: { teks: "Submitted (Menunggu ACC)", gaya: "bg-yellow-100 text-yellow-800" },
  approved: { teks: "Approved", gaya: "bg-green-100 text-green-800" },
  draft: { teks: "Draft (Belum Submit)", gaya: "bg-slate-200 text-slate-700" },
};

/* ---------------- Tab Wali ---------------- */
function TabWali({ setPesan }) {
  const [daftar, setDaftar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dosen/wali/mahasiswa")
      .then((r) => setDaftar(r.data))
      .catch((e) => setPesan({ type: "error", teks: e.userMessage }))
      .finally(() => setLoading(false));
  }, [setPesan]);

  async function acc(mhs) {
    if (!window.confirm("Setujui KRS mahasiswa ini?")) return;
    try {
      await api.post(`/dosen/wali/krs/${mhs.id}/acc`);
      setDaftar((d) => d.map((x) => (x.id === mhs.id ? { ...x, status_krs: "approved" } : x)));
      setPesan({ type: "success", teks: "KRS berhasil disetujui." });
    } catch (e) {
      setPesan({ type: "error", teks: e.userMessage });
    }
  }

  if (loading) return <p className="text-slate-500">Memuat...</p>;

  return (
    <div className="card overflow-x-auto">
      <h3 className="font-semibold mb-3">Mahasiswa Bimbingan</h3>
      <table className="w-full">
        <thead>
          <tr>
            <th className="th">NIM</th>
            <th className="th">Nama</th>
            <th className="th">Total SKS</th>
            <th className="th">Status KRS</th>
            <th className="th">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {daftar.map((m) => {
            const s = STATUS_KRS[m.status_krs] ?? STATUS_KRS.draft;
            return (
              <tr key={m.id}>
                <td className="td">{m.nim}</td>
                {/* Nama dirender sebagai teks murni (auto-escape React) */}
                <td className="td">{m.nama}</td>
                <td className="td">{m.total_sks}</td>
                <td className="td">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.gaya}`}>{s.teks}</span>
                </td>
                <td className="td">
                  <button
                    className="btn-primary text-xs"
                    disabled={m.status_krs !== "submitted"}
                    onClick={() => acc(m)}
                  >
                    ACC KRS
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Tab Pengampu ---------------- */
function TabPengampu({ setPesan }) {
  const [kelas, setKelas] = useState([]);
  const [aktif, setAktif] = useState(null);
  const [nilai, setNilai] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dosen/pengampu/kelas")
      .then((r) => {
        setKelas(r.data);
        if (r.data.length) setAktif(r.data[0].id);
      })
      .catch((e) => setPesan({ type: "error", teks: e.userMessage }))
      .finally(() => setLoading(false));
  }, [setPesan]);

  useEffect(() => {
    if (aktif == null) return;
    api
      .get(`/dosen/pengampu/kelas/${aktif}/nilai`)
      .then((r) => setNilai(r.data))
      .catch((e) => setPesan({ type: "error", teks: e.userMessage }));
  }, [aktif, setPesan]);

  const semuaTerkunci = nilai.length > 0 && nilai.every((n) => n.status_kunci);

  async function simpan(item, nilaiBaru) {
    try {
      await api.put(`/dosen/nilai/${item.id}`, { nilai_angka: nilaiBaru });
      setPesan({ type: "success", teks: "Draf nilai tersimpan." });
    } catch (e) {
      setPesan({ type: "error", teks: e.userMessage });
    }
  }

  // Pengajuan koreksi nilai terkunci -> tiket eskalasi (Kaprodi -> Kajur -> Admin)
  async function ajukanKoreksi(item, nilaiBaru, alasan) {
    try {
      await api.post("/dosen/koreksi", { nilai_id: item.id, nilai_baru: nilaiBaru, alasan });
      setPesan({ type: "success", teks: "Tiket koreksi nilai terkirim ke Kaprodi untuk direview." });
      return true;
    } catch (e) {
      setPesan({ type: "error", teks: e.userMessage });
      return false;
    }
  }

  async function kunci() {
    if (!window.confirm("Kunci nilai kelas ini? Setelah dikunci, perubahan hanya bisa lewat tiket eskalasi ke Kajur.")) return;
    try {
      await api.post(`/dosen/pengampu/kelas/${aktif}/kunci`);
      setNilai((n) => n.map((x) => ({ ...x, status_kunci: true })));
      setPesan({ type: "success", teks: "Nilai kelas berhasil dikunci." });
    } catch (e) {
      setPesan({ type: "error", teks: e.userMessage });
    }
  }

  if (loading) return <p className="text-slate-500">Memuat...</p>;
  if (kelas.length === 0) return <div className="card text-slate-500">Anda belum ditugaskan mengampu kelas.</div>;

  return (
    <div className="card overflow-x-auto">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h3 className="font-semibold">Input Nilai</h3>
        <select className="border rounded px-2 py-1" value={aktif ?? ""} onChange={(e) => setAktif(Number(e.target.value))}>
          {kelas.map((k) => (
            <option key={k.id} value={k.id}>
              {k.kode} - {k.nama}
            </option>
          ))}
        </select>
        <button className="btn-danger ml-auto" onClick={kunci} disabled={semuaTerkunci || nilai.length === 0}>
          Kunci Nilai
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="th">Mahasiswa</th>
            <th className="th">Nilai (0-100)</th>
            <th className="th">Status</th>
          </tr>
        </thead>
        <tbody>
          {/* key memuat status_kunci agar baris di-render ulang saat dikunci */}
          {nilai.map((n) => (
            <GradeInputRow key={`${n.id}-${n.status_kunci}`} item={n} onSave={simpan} onKoreksi={ajukanKoreksi} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardDosen() {
  const [tab, setTab] = useState("wali");
  const [pesan, setPesan] = useState({ type: "error", teks: "" });

  const tabCls = (t) =>
    `px-4 py-2 rounded-t font-medium ${tab === t ? "bg-white text-blue-800 shadow" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}`;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Dashboard Dosen</h2>
      <Alert type={pesan.type} pesan={pesan.teks} />
      <div className="flex gap-1 mb-0">
        <button className={tabCls("wali")} onClick={() => setTab("wali")}>
          Wali
        </button>
        <button className={tabCls("pengampu")} onClick={() => setTab("pengampu")}>
          Pengampu
        </button>
      </div>
      {tab === "wali" ? <TabWali setPesan={setPesan} /> : <TabPengampu setPesan={setPesan} />}
    </div>
  );
}
```

## src/pages/kajur/DashboardKajur.jsx

```jsx
import { useEffect, useState } from "react";
import api from "../../api/client";
import Alert from "../../components/ErrorAlert";
import StatusTiket from "../../components/StatusTiket";

const WARNA_NILAI = { A: "bg-green-500", B: "bg-blue-500", C: "bg-yellow-500", D: "bg-orange-500", E: "bg-red-500" };

/**
 * Dashboard Kajur (RBAC laporan):
 *  - Audit makro & evaluasi capaian mutu SELURUH prodi (visibilitas baca)
 *  - Persetujuan tertinggi (Final Approval) pembukaan kunci nilai
 * Separation of Duties: Kajur TIDAK menginput nilai dan TIDAK menyetujui KRS mahasiswa.
 * Kajur hanya bisa memutuskan tiket yang sudah direkomendasikan Kaprodi.
 */
export default function DashboardKajur() {
  const [stat, setStat] = useState(null);
  const [tiket, setTiket] = useState([]);
  const [pesan, setPesan] = useState({ type: "error", teks: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/kajur/statistik"), api.get("/kajur/tiket")])
      .then(([s, t]) => {
        setStat(s.data);
        setTiket(t.data);
      })
      .catch((e) => setPesan({ type: "error", teks: e.userMessage }))
      .finally(() => setLoading(false));
  }, []);

  async function putuskan(t, setuju) {
    const aksi = setuju ? "menyetujui pembukaan kunci" : "menolak";
    if (!window.confirm(`Yakin ingin ${aksi} nilai ini? (Final Approval)`)) return;
    try {
      await api.post(`/kajur/tiket/${t.id}/keputusan`, { setuju });
      setTiket((list) =>
        list.map((x) => (x.id === t.id ? { ...x, status: setuju ? "disetujui_kajur" : "ditolak" } : x))
      );
      setPesan({
        type: "success",
        teks: setuju ? "Disetujui. Admin akan mengeksekusi pembukaan kunci." : "Tiket ditolak.",
      });
    } catch (e) {
      setPesan({ type: "error", teks: e.userMessage });
    }
  }

  if (loading) return <p className="text-slate-500">Memuat data...</p>;
  if (!stat) return <Alert type="error" pesan={pesan.teks} />;

  const dist = stat.distribusi_nilai;
  const maks = Math.max(...Object.values(dist), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard Ketua Jurusan</h2>
      <Alert type={pesan.type} pesan={pesan.teks} />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Tingkat Kelulusan Jurusan</p>
          <p className="text-2xl font-bold text-green-700">{stat.tingkat_kelulusan}%</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Mahasiswa Aktif</p>
          <p className="text-2xl font-bold">{stat.total_mahasiswa}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Rata-rata IPK Jurusan</p>
          <p className="text-2xl font-bold">{stat.rata_ipk}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="card overflow-x-auto">
          <h3 className="font-semibold mb-3">Evaluasi Capaian Mutu per Prodi</h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Program Studi</th>
                <th className="th">Mahasiswa</th>
                <th className="th">Rata IPK</th>
                <th className="th">Kelulusan</th>
              </tr>
            </thead>
            <tbody>
              {stat.prodi.map((p) => (
                <tr key={p.nama}>
                  <td className="td">{p.nama}</td>
                  <td className="td">{p.mahasiswa}</td>
                  <td className="td">{p.rata_ipk}</td>
                  <td className="td">{p.kelulusan}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3 className="font-semibold mb-3">Rekap Distribusi Nilai Jurusan</h3>
          <div className="space-y-2">
            {Object.entries(dist).map(([huruf, jumlah]) => (
              <div key={huruf} className="flex items-center gap-3">
                <span className="w-6 font-semibold">{huruf}</span>
                <div className="flex-1 bg-slate-100 rounded h-5">
                  <div
                    className={`${WARNA_NILAI[huruf] ?? "bg-slate-500"} h-5 rounded`}
                    style={{ width: `${(jumlah / maks) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm">{jumlah}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card overflow-x-auto">
        <h3 className="font-semibold mb-1">Persetujuan Tertinggi: Pembukaan Kunci Nilai</h3>
        <p className="text-sm text-slate-500 mb-3">
          Hanya tiket yang sudah direkomendasikan Kaprodi yang dapat diputuskan di sini.
        </p>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Kelas</th>
              <th className="th">Mahasiswa</th>
              <th className="th">Nilai Lama</th>
              <th className="th">Nilai Baru</th>
              <th className="th">Alasan Revisi</th>
              <th className="th">Status</th>
              <th className="th">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tiket.map((t) => (
              <tr key={t.id}>
                <td className="td">{t.kelas}</td>
                <td className="td">{t.mahasiswa}</td>
                <td className="td">{t.nilai_lama}</td>
                <td className="td font-semibold">{t.nilai_baru}</td>
                {/* Catatan revisi dari user -> string murni (auto-escape React) */}
                <td className="td max-w-xs break-words">{t.alasan}</td>
                <td className="td"><StatusTiket status={t.status} /></td>
                <td className="td whitespace-nowrap">
                  {t.status === "direkomendasikan" ? (
                    <>
                      <button className="btn-primary text-xs mr-1" onClick={() => putuskan(t, true)}>
                        Setujui
                      </button>
                      <button className="btn-danger text-xs" onClick={() => putuskan(t, false)}>
                        Tolak
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">-</span>
                  )}
                </td>
              </tr>
            ))}
            {tiket.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={7}>Tidak ada tiket.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

## src/pages/kaprodi/DashboardKaprodi.jsx

```jsx
import { useEffect, useState } from "react";
import api from "../../api/client";
import Alert from "../../components/ErrorAlert";
import StatusTiket from "../../components/StatusTiket";

const WARNA_NILAI = { A: "bg-green-500", B: "bg-blue-500", C: "bg-yellow-500", D: "bg-orange-500", E: "bg-red-500" };

/**
 * Dashboard Kaprodi (RBAC laporan):
 *  - Review & rekapitulasi data akademik TINGKAT PRODI (visibilitas baca)
 *  - Review awal & rekomendasi eskalasi koreksi nilai (diteruskan ke Kajur)
 * Kaprodi TIDAK mengubah master data, TIDAK menghapus akun, TIDAK memberi persetujuan akhir.
 */
export default function DashboardKaprodi() {
  const [rekap, setRekap] = useState(null);
  const [tiket, setTiket] = useState([]);
  const [pesan, setPesan] = useState({ type: "error", teks: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/kaprodi/rekap"), api.get("/kaprodi/tiket")])
      .then(([r, t]) => {
        setRekap(r.data);
        setTiket(t.data);
      })
      .catch((e) => setPesan({ type: "error", teks: e.userMessage }))
      .finally(() => setLoading(false));
  }, []);

  async function review(t, rekomendasi) {
    const aksi = rekomendasi ? "merekomendasikan ke Kajur" : "menolak";
    if (!window.confirm(`Yakin ingin ${aksi} koreksi nilai ini?`)) return;
    try {
      await api.post(`/kaprodi/tiket/${t.id}/review`, { rekomendasi });
      setTiket((list) =>
        list.map((x) => (x.id === t.id ? { ...x, status: rekomendasi ? "direkomendasikan" : "ditolak" } : x))
      );
      setPesan({ type: "success", teks: rekomendasi ? "Tiket direkomendasikan ke Kajur." : "Tiket ditolak." });
    } catch (e) {
      setPesan({ type: "error", teks: e.userMessage });
    }
  }

  if (loading) return <p className="text-slate-500">Memuat data...</p>;
  if (!rekap) return <Alert type="error" pesan={pesan.teks} />;

  const dist = rekap.distribusi_nilai;
  const maks = Math.max(...Object.values(dist), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard Kaprodi</h2>
      <p className="text-sm text-slate-500 -mt-4">Program Studi: {rekap.prodi}</p>
      <Alert type={pesan.type} pesan={pesan.teks} />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Mahasiswa Prodi</p>
          <p className="text-2xl font-bold">{rekap.total_mahasiswa}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Rata-rata IPK Prodi</p>
          <p className="text-2xl font-bold">{rekap.rata_ipk}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Status Perwalian KRS</p>
          <p className="text-sm mt-1">
            Draft <strong>{rekap.perwalian.draft}</strong> · Submitted <strong>{rekap.perwalian.submitted}</strong> ·
            Approved <strong>{rekap.perwalian.approved}</strong>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="card">
          <h3 className="font-semibold mb-3">Distribusi Nilai Prodi</h3>
          <div className="space-y-2">
            {Object.entries(dist).map(([huruf, jumlah]) => (
              <div key={huruf} className="flex items-center gap-3">
                <span className="w-6 font-semibold">{huruf}</span>
                <div className="flex-1 bg-slate-100 rounded h-5">
                  <div
                    className={`${WARNA_NILAI[huruf] ?? "bg-slate-500"} h-5 rounded`}
                    style={{ width: `${(jumlah / maks) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm">{jumlah}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card overflow-x-auto">
          <h3 className="font-semibold mb-3">Distribusi Beban Mengajar</h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Dosen</th>
                <th className="th">Kelas</th>
                <th className="th">Total SKS</th>
              </tr>
            </thead>
            <tbody>
              {rekap.beban_mengajar.map((d) => (
                <tr key={d.dosen}>
                  <td className="td">{d.dosen}</td>
                  <td className="td">{d.jumlah_kelas}</td>
                  <td className="td">{d.total_sks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card overflow-x-auto">
        <h3 className="font-semibold mb-1">Review Awal & Rekomendasi Eskalasi Koreksi Nilai</h3>
        <p className="text-sm text-slate-500 mb-3">
          Rekomendasi Anda diteruskan ke Kajur untuk persetujuan tertinggi. Pembukaan kunci dieksekusi oleh Admin.
        </p>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Kelas</th>
              <th className="th">Mahasiswa</th>
              <th className="th">Nilai Lama</th>
              <th className="th">Nilai Baru</th>
              <th className="th">Alasan Revisi</th>
              <th className="th">Status</th>
              <th className="th">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tiket.map((t) => (
              <tr key={t.id}>
                <td className="td">{t.kelas}</td>
                <td className="td">{t.mahasiswa}</td>
                <td className="td">{t.nilai_lama}</td>
                <td className="td font-semibold">{t.nilai_baru}</td>
                {/* Alasan dari user: dirender sebagai teks murni (auto-escape React) */}
                <td className="td max-w-xs break-words">{t.alasan}</td>
                <td className="td"><StatusTiket status={t.status} /></td>
                <td className="td whitespace-nowrap">
                  {t.status === "menunggu_review" ? (
                    <>
                      <button className="btn-primary text-xs mr-1" onClick={() => review(t, true)}>
                        Rekomendasikan
                      </button>
                      <button className="btn-danger text-xs" onClick={() => review(t, false)}>
                        Tolak
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500">Sudah diproses</span>
                  )}
                </td>
              </tr>
            ))}
            {tiket.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={7}>Tidak ada tiket.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

## src/pages/mahasiswa/DashboardMhs.jsx

```jsx
import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Alert from "../../components/ErrorAlert";
import { MAKS_SKS, validasiKRS } from "../../utils/validators";

// Status KRS sesuai laporan: draft -> submitted -> approved
const STATUS_KRS = {
  draft: { teks: "Draft (Belum Disubmit)", gaya: "bg-slate-200 text-slate-700" },
  submitted: { teks: "Submitted, Menunggu ACC Dosen Wali", gaya: "bg-yellow-100 text-yellow-800" },
  approved: { teks: "Approved Dosen Wali", gaya: "bg-green-100 text-green-800" },
};

export default function DashboardMhs() {
  const [katalog, setKatalog] = useState([]);
  const [periode, setPeriode] = useState(null);
  const [krs, setKrs] = useState({ status: "draft", kelas_ids: [] });
  const [khs, setKhs] = useState([]);
  const [dipilih, setDipilih] = useState([]);
  const [pesan, setPesan] = useState({ type: "error", teks: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/mahasiswa/kelas"), api.get("/mahasiswa/krs"), api.get("/mahasiswa/khs")])
      .then(([k, r, h]) => {
        setKatalog(k.data.kelas);
        setPeriode(k.data.periode);
        setKrs(r.data);
        setDipilih(r.data.kelas_ids ?? []);
        setKhs(h.data);
      })
      .catch((err) => setPesan({ type: "error", teks: err.userMessage }))
      .finally(() => setLoading(false));
  }, []);

  const totalSks = useMemo(
    () => katalog.filter((k) => dipilih.includes(k.id)).reduce((s, k) => s + k.sks, 0),
    [katalog, dipilih]
  );

  // Sesuai RBAC: KRS hanya bisa dibuat/diubah/dihapus saat status 'draft' (dan masa KRS aktif).
  // Setelah 'submitted' tidak bisa diubah. Server tetap yang memeriksa krs.mahasiswa_id = user.id.
  const bisaEdit = periode?.aktif && krs.status === "draft";

  function toggle(id) {
    setDipilih((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  // submit=false -> simpan sebagai draft; submit=true -> kirim ke dosen wali (tidak bisa diubah lagi)
  async function simpan(submit) {
    if (submit) {
      const err = validasiKRS(dipilih, totalSks);
      if (err) return setPesan({ type: "error", teks: err });
      if (!window.confirm("Submit KRS ke dosen wali? Setelah disubmit KRS tidak dapat diubah.")) return;
    } else if (totalSks > MAKS_SKS) {
      return setPesan({ type: "error", teks: `Total SKS melebihi batas maksimum (${MAKS_SKS} SKS).` });
    }
    setSaving(true);
    try {
      const res = await api.post("/mahasiswa/krs", { kelas_ids: dipilih, submit });
      setKrs(res.data);
      setPesan({
        type: "success",
        teks: submit ? "KRS berhasil disubmit ke dosen wali." : "Draft KRS berhasil disimpan.",
      });
    } catch (e) {
      setPesan({ type: "error", teks: e.userMessage });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-500">Memuat data...</p>;

  const status = STATUS_KRS[krs.status] ?? STATUS_KRS.draft;
  const sksLulus = khs.reduce((s, x) => s + x.sks, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard Mahasiswa</h2>
      <Alert type={pesan.type} pesan={pesan.teks} />

      {/* Ringkasan */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">SKS Dipilih</p>
          <p className="text-2xl font-bold">
            {totalSks} <span className="text-sm font-normal text-slate-500">/ {MAKS_SKS}</span>
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Status ACC Dosen Wali</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-sm font-semibold ${status.gaya}`}>
            {status.teks}
          </span>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Periode Pengisian KRS</p>
          <p className={`font-semibold ${periode?.aktif ? "text-green-700" : "text-red-700"}`}>
            {periode?.aktif ? "Dibuka" : "Ditutup"}
          </p>
          <p className="text-xs text-slate-500">
            {periode?.mulai} s/d {periode?.selesai}
          </p>
        </div>
      </div>

      {/* Katalog & pemilihan KRS */}
      <section className="card">
        <h3 className="font-semibold mb-3">Katalog Kelas & Pemilihan KRS</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th w-10">Pilih</th>
                <th className="th">Kode</th>
                <th className="th">Mata Kuliah</th>
                <th className="th">SKS</th>
                <th className="th">Dosen</th>
                <th className="th">Jadwal</th>
              </tr>
            </thead>
            <tbody>
              {katalog.map((k) => {
                const tanpaDosen = !k.dosen_nama;
                return (
                  <tr key={k.id} className={tanpaDosen ? "opacity-60" : ""}>
                    <td className="td">
                      <input
                        type="checkbox"
                        checked={dipilih.includes(k.id)}
                        onChange={() => toggle(k.id)}
                        disabled={!bisaEdit || tanpaDosen}
                        aria-label={`Pilih ${k.nama}`}
                      />
                    </td>
                    <td className="td">{k.kode}</td>
                    <td className="td">{k.nama}</td>
                    <td className="td">{k.sks}</td>
                    <td className="td">{k.dosen_nama ?? <em className="text-slate-400">Belum ditugaskan</em>}</td>
                    <td className="td">{k.jadwal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-secondary" onClick={() => simpan(false)} disabled={!bisaEdit || saving}>
            Simpan Draft
          </button>
          <button className="btn-primary" onClick={() => simpan(true)} disabled={!bisaEdit || saving}>
            {saving ? "Menyimpan..." : "Submit KRS"}
          </button>
          {!periode?.aktif && <span className="text-sm text-red-600">Masa pengisian KRS sedang ditutup.</span>}
          {krs.status === "submitted" && <span className="text-sm text-yellow-800">KRS sudah disubmit dan menunggu ACC dosen wali; tidak bisa diubah.</span>}
          {krs.status === "approved" && <span className="text-sm text-green-700">KRS sudah disetujui dan tidak bisa diubah.</span>}
        </div>
      </section>

      {/* KHS */}
      <section className="card">
        <h3 className="font-semibold mb-3">Kartu Hasil Studi (KHS)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Kode</th>
                <th className="th">Mata Kuliah</th>
                <th className="th">SKS</th>
                <th className="th">Nilai Angka</th>
                <th className="th">Nilai Huruf</th>
              </tr>
            </thead>
            <tbody>
              {khs.map((r) => (
                <tr key={r.kode}>
                  <td className="td">{r.kode}</td>
                  <td className="td">{r.nama}</td>
                  <td className="td">{r.sks}</td>
                  <td className="td">{r.nilai_angka}</td>
                  <td className="td font-semibold">{r.nilai_huruf}</td>
                </tr>
              ))}
              {khs.length === 0 && (
                <tr>
                  <td className="td text-slate-500" colSpan={5}>
                    Belum ada nilai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-slate-500 mt-2">Total SKS tempuh: {sksLulus}</p>
      </section>
    </div>
  );
}
```

## src/utils/sanitize.jsx

```jsx
import DOMPurify from "dompurify";

/**
 * PRINSIP UTAMA: React sudah meng-escape semua teks di dalam {} secara otomatis.
 * Jadi <script>alert(1)</script> yang dirender sebagai {nama} tampil sebagai teks biasa.
 *
 * Fungsi di bawah dipakai HANYA untuk dua keadaan:
 * 1. Membersihkan input sebelum dikirim ke backend (defense in depth).
 * 2. Jika terpaksa merender HTML (dangerouslySetInnerHTML) -> wajib lewat DOMPurify.
 */

/** Hapus semua tag HTML dari string -> hasilnya teks murni. */
export function bersihkanTeks(nilai) {
  if (typeof nilai !== "string") return "";
  return DOMPurify.sanitize(nilai, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/** Sanitasi HTML (misal catatan kaya format). Hanya tag aman yang lolos. */
export function bersihkanHTML(html) {
  if (typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  });
}

/** Komponen-aman: render HTML yang sudah disanitasi. Satu-satunya tempat dangerouslySetInnerHTML. */
export function SafeHTML({ html, className }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: bersihkanHTML(html) }} />;
}
```

## src/utils/validators.js

```jsx
/**
 * Validasi form sisi klien. Ini untuk UX (umpan balik cepat),
 * BUKAN pengganti validasi backend. Backend tetap sumber kebenaran.
 */

export function validasiLogin({ username, password }) {
  const errors = {};
  if (!username || username.trim().length < 3) {
    errors.username = "Username minimal 3 karakter.";
  } else if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
    errors.username = "Username hanya boleh huruf, angka, titik, garis bawah, atau strip.";
  }
  // [MODUL VI] Login hanya memverifikasi password yang SUDAH ada, jadi cukup cek tidak kosong.
  // Aturan kompleksitas tidak ditegakkan di sini agar user lama tidak terkunci dari awal.
  if (!password) {
    errors.password = "Password wajib diisi.";
  }
  return errors;
}

/* ============================================================
 * [MODUL VI] Password Policy sisi klien (meniru validate_password MySQL)
 * length = 8, policy = STRONG -> huruf besar, huruf kecil, angka, simbol.
 * Hanya umpan balik cepat; MySQL / backend tetap yang menolak sebenarnya.
 * ============================================================ */
export const PANJANG_MIN_PASSWORD = 8;

/** Kembalikan status tiap aturan password (dipakai untuk daftar centang di UI). */
export function cekAturanPassword(password = "") {
  return [
    { label: `Minimal ${PANJANG_MIN_PASSWORD} karakter`, ok: password.length >= PANJANG_MIN_PASSWORD },
    { label: "Ada huruf besar (A-Z)", ok: /[A-Z]/.test(password) },
    { label: "Ada huruf kecil (a-z)", ok: /[a-z]/.test(password) },
    { label: "Ada angka (0-9)", ok: /[0-9]/.test(password) },
    { label: "Ada simbol (mis. # ! @ $)", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

/** Tingkat kekuatan: 0-1 aturan = Lemah, 2-4 = Sedang, 5 = Kuat (STRONG). */
export function kekuatanPassword(password = "") {
  const lulus = cekAturanPassword(password).filter((a) => a.ok).length;
  if (lulus === 5) return { teks: "Kuat", warna: "bg-green-500", lebar: "100%" };
  if (lulus >= 2) return { teks: "Sedang", warna: "bg-yellow-500", lebar: "60%" };
  return { teks: "Lemah", warna: "bg-red-500", lebar: "25%" };
}

/** Error password sesuai policy, atau null jika lolos. */
export function validasiPasswordPolicy(password) {
  const gagal = cekAturanPassword(password).filter((a) => !a.ok);
  if (gagal.length === 0) return null;
  return "Password belum memenuhi kebijakan: " + gagal.map((a) => a.label).join("; ") + ".";
}

/** Pengajuan koreksi nilai pasca-kunci (Dosen Pengampu -> Kaprodi -> Kajur -> Admin). */
export function validasiKoreksi(nilaiBaru, alasan) {
  const errors = {};
  if (nilaiBaru === "" || nilaiBaru === null || nilaiBaru === undefined) errors.nilai = "Nilai baru wajib diisi.";
  else if (Number.isNaN(Number(nilaiBaru)) || Number(nilaiBaru) < 0 || Number(nilaiBaru) > 100)
    errors.nilai = "Nilai baru harus angka 0-100.";
  if (!alasan || alasan.trim().length < 10) errors.alasan = "Alasan revisi minimal 10 karakter.";
  return errors;
}

/** Nilai angka 0 - 100. Kembalikan string error atau null jika valid. */
export function validasiNilai(nilai) {
  if (nilai === "" || nilai === null || nilai === undefined) return "Nilai wajib diisi.";
  const n = Number(nilai);
  if (Number.isNaN(n)) return "Nilai harus berupa angka.";
  if (n < 0 || n > 100) return "Nilai harus antara 0 dan 100.";
  return null;
}

/** 5 role dasar sistem (sesuai matriks RBAC laporan kelompok). */
export const ROLES = ["admin", "mahasiswa", "dosen", "kaprodi", "kajur"];

/** Validasi master mata kuliah (Admin). */
export function validasiMataKuliah({ kode, nama, sks }) {
  const errors = {};
  if (!kode || !/^[A-Z0-9-]{3,12}$/.test(kode.trim().toUpperCase())) errors.kode = "Kode 3-12 karakter (huruf, angka, strip).";
  if (!nama || nama.trim().length < 3) errors.nama = "Nama mata kuliah minimal 3 karakter.";
  const n = Number(sks);
  if (!Number.isInteger(n) || n < 1 || n > 6) errors.sks = "SKS harus bilangan bulat 1-6.";
  return errors;
}

/** Validasi pembukaan kelas (Admin). */
export function validasiKelas({ mata_kuliah_id, jadwal, kuota }) {
  const errors = {};
  if (!mata_kuliah_id) errors.mata_kuliah_id = "Pilih mata kuliah.";
  if (!jadwal || jadwal.trim().length < 3) errors.jadwal = "Jadwal wajib diisi.";
  const k = Number(kuota);
  if (!Number.isInteger(k) || k < 1 || k > 200) errors.kuota = "Kuota 1-200.";
  return errors;
}

/** Batas SKS KRS (contoh: 24). Sesuaikan dengan aturan kampus/backend. */
export const MAKS_SKS = 24;

export function validasiKRS(kelasTerpilih, totalSks) {
  if (kelasTerpilih.length === 0) return "Pilih minimal satu kelas.";
  if (totalSks > MAKS_SKS) return `Total SKS melebihi batas maksimum (${MAKS_SKS} SKS).`;
  return null;
}

export function validasiAkun({ username, nama, role, password }, { wajibPassword = true } = {}) {
  const errors = {};
  if (!username || !/^[a-zA-Z0-9._-]{3,30}$/.test(username.trim())) {
    errors.username = "Username 3-30 karakter (huruf, angka, . _ -).";
  }
  if (!nama || nama.trim().length < 2) errors.nama = "Nama minimal 2 karakter.";
  // 5 role sesuai RBAC laporan: admin, mahasiswa, dosen, kaprodi, kajur
  if (!ROLES.includes(role)) errors.role = "Role tidak valid.";
  // [MODUL VI] Password akun baru wajib memenuhi policy (8 karakter + besar/kecil/angka/simbol)
  if (wajibPassword) {
    const err = validasiPasswordPolicy(password || "");
    if (err) errors.password = err;
  }
  return errors;
}
```

