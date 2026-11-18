# Penjelasan Modul Kerja Oca - Frontend Developer & UI/UX SIKMA

Dokumen ini untuk bahan menjelaskan ke ketua tim: apa yang sudah dibuat, kenapa dibuat begitu, dan di file mana.

---

## 1. Ringkasan Satu Kalimat

Saya membangun antarmuka SIKMA berbasis React (Vite) + Tailwind CSS untuk 5 role sesuai matriks RBAC laporan kelompok (Admin, Mahasiswa, Dosen, Kaprodi, Kajur), dengan keamanan sisi klien: anti-XSS, rute terlindungi per role, token sesi di cookie HttpOnly, dan pesan error ramah tanpa membocorkan detail teknis.

---

## 2. Pemetaan Deliverable Modul -> File

| Deliverable di modul | Status | File |
|---|---|---|
| SPA React + Vite + Tailwind | Selesai | `package.json`, `vite.config.js`, `tailwind.config.js`, `src/main.jsx` |
| Role-Based Routing & Navigation | Selesai | `src/App.jsx`, `src/components/ProtectedRoute.jsx`, `src/components/Layout.jsx` |
| Halaman Login | Selesai | `src/pages/Login.jsx` |
| Pemilihan KRS Mahasiswa | Selesai | `src/pages/mahasiswa/DashboardMhs.jsx` |
| Approval Dosen Wali | Selesai | `src/pages/dosen/DashboardDosen.jsx` (tab Wali) |
| Input Nilai Dosen Pengampu | Selesai | `DashboardDosen.jsx` (tab Pengampu) + `src/components/GradeInputRow.jsx` |
| Dasbor Monitoring Kajur | Selesai | `src/pages/kajur/DashboardKajur.jsx` |
| Dasbor Admin | Selesai | `src/pages/admin/DashboardAdmin.jsx` |
| Sanitasi input klien | Selesai | `src/utils/sanitize.jsx`, `src/utils/validators.js` |
| Error handling ramah pengguna | Selesai | `src/api/client.js` (fungsi `pesanErrorRamah`) |

---

## 3. Penjelasan Tiap Bagian (versi mudah dijelaskan)

### 3.1 Role-Based Routing (`ProtectedRoute`)
- Setiap halaman dibungkus `ProtectedRoute allowedRoles={[...]}`.
- Belum login -> dialihkan ke `/login`. Sudah login tapi role salah -> tampil **403 - Akses Ditolak untuk Role Anda**. Contoh: mahasiswa mengetik `/dashboard/admin` di URL akan ditolak.
- URL tiap role sesuai tabel modul: `/dashboard/mhs`, `/dashboard/dosen`, `/dashboard/kajur`, `/dashboard/admin`.
- Menu di header (`Layout.jsx`) berbeda per role.
- **Poin penting:** ini hanya lapisan tampilan (UX). Keamanan sebenarnya ada di backend (Dimas) yang mengecek role di tiap endpoint. Frontend bisa dimodifikasi penyerang, backend tidak.
- Ada status `loading` agar saat halaman di-refresh user tidak terpental ke login sebelum sesi dipulihkan.

### 3.2 Proteksi XSS
- **React meng-escape otomatis** semua teks di dalam `{ }`. Nama seperti `<script>alert(1)</script>` tampil sebagai teks biasa, tidak dieksekusi.
- Semua data dari database (nama, catatan revisi, kode kelas) dirender sebagai string murni.
- `dangerouslySetInnerHTML` **tidak dipakai di halaman mana pun**. Satu-satunya tempat yang disediakan adalah komponen `SafeHTML` di `sanitize.jsx`, dan isinya wajib lewat **DOMPurify**.
- Input form juga dibersihkan (`bersihkanTeks`) sebelum dikirim, sebagai lapisan kedua (defense in depth).
- Untuk uji: data mock sudah berisi nama `<script>alert(1)</script>` dan `<img src=x onerror=alert(1)>`. Kalau UI benar, keduanya muncul sebagai teks.

### 3.3 Visualisasi State Lock pada Input Nilai (`GradeInputRow`)
- Jika `status_kunci === true`: input **disabled**, baris berwarna abu, tombol diganti badge merah **"Terkunci Permanen"**.
- Jika belum dikunci: ada tombol **Simpan Draf** (dengan validasi nilai 0-100).
- Tombol **Kunci Nilai** per kelas mengunci semua nilai; perubahan setelahnya hanya lewat tiket eskalasi yang ditinjau Kajur.
- Ini membantu backend, bukan menggantikannya: backend tetap harus menolak edit pada nilai terkunci.

### 3.4 Penanganan Token Sesi (HttpOnly)
- Token ada di **cookie HttpOnly** yang tidak bisa dibaca JavaScript, jadi skrip XSS tidak bisa mencurinya.
- Karena itu **tidak ada token di localStorage**. Data user hanya di memori (state React).
- Semua request memakai `withCredentials: true` (`axios.defaults.withCredentials = true` dan pada instance axios) supaya browser mengirim cookie.
- Saat refresh, aplikasi memanggil `GET /auth/me` untuk memulihkan sesi dari cookie.

### 3.5 Error Handling Ramah Pengguna
- Interceptor di `client.js` mengubah status HTTP menjadi pesan bahasa Indonesia yang aman (401 = sesi berakhir, 403 = tidak punya izin, 409 = data terkunci/berubah, dst.).
- Pesan mentah server (SQL error, stack trace) **tidak pernah ditampilkan**.
- Login sengaja memakai pesan generik "Username atau password salah" agar tidak membocorkan apakah username ada.
- Status 401 di mana pun otomatis logout dan kembali ke login.

### 3.6 Validasi Form Klien (`validators.js`)
- Login: format username dan panjang password.
- Nilai: angka 0-100.
- KRS: minimal 1 kelas, maksimal **24 SKS** (angka ini asumsi, sesuaikan aturan kampus).
- Akun baru (Admin): format username, nama, role valid, password minimal 8.
- Validasi klien hanya untuk umpan balik cepat; backend tetap sumber kebenaran.

---

## 4. Fitur per Role (disesuaikan dengan RBAC laporan kelompok)

Dosen Wali dan Dosen Pengampu **bukan role terpisah**: keduanya role `dosen`, dibedakan secara kontekstual lewat `dosen_wali_id` dan `dosen_id` (keputusan diskusi kelompok no. 1).

| Role | Halaman | Yang bisa dilakukan | Yang sengaja tidak ada |
|---|---|---|---|
| Admin | `/dashboard/admin` | CRUD akun (5 role), master mata kuliah, buka kelas + tugaskan dosen, eksekusi teknis buka kunci nilai, masa KRS | Tidak ada form ubah nilai (dilarang sepihak) |
| Mahasiswa | `/dashboard/mhs` | Pilih kelas, Simpan Draft, Submit KRS, lihat status perwalian dan KHS | KRS tidak bisa diubah setelah `submitted` |
| Dosen | `/dashboard/dosen` | Tab Wali: ACC KRS yang `submitted`. Tab Pengampu: input nilai, Kunci Nilai, Ajukan Koreksi (untuk nilai terkunci) | Tidak bisa membuka kunci sendiri |
| Kaprodi | `/dashboard/kaprodi` | Rekap tingkat prodi (distribusi nilai, beban mengajar, status perwalian), review awal dan rekomendasi koreksi nilai | Tidak ubah master data, tidak hapus akun, tidak memberi persetujuan akhir |
| Kajur | `/dashboard/kajur` | Audit makro dan mutu semua prodi, persetujuan tertinggi (Final Approval) buka kunci | Tidak input nilai, tidak menyetujui KRS (Separation of Duties) |

Alur koreksi nilai pasca-kunci (berjenjang, tiap tahap hanya bisa dilakukan role yang berwenang):

0. **Dosen Pengampu** menekan "Ajukan Koreksi" pada nilai terkunci (isi nilai baru + alasan), tiket dibuat berstatus `menunggu_review`. Laporan tidak menyebut siapa yang mengajukan; saya mengasumsikan Dosen Pengampu karena dialah yang mengunci nilai. Konfirmasi ke kelompok.
1. `menunggu_review` -> **Kaprodi** merekomendasikan atau menolak
2. `direkomendasikan` -> **Kajur** memberi Final Approval atau menolak
3. `disetujui_kajur` -> **Admin** mengeksekusi buka kunci (`status_kunci = FALSE`)
4. `dieksekusi` -> Dosen Pengampu dapat mengoreksi nilai

Status KRS mengikuti laporan: `draft` -> `submitted` -> `approved`.

---

## 5. Alur Kolaborasi Tim (sesuai modul)

- **Dimas (Backend):** samakan format JSON, terutama error 401/403. Daftar endpoint yang saya asumsikan ada di bagian 7. Mohon dicocokkan.
- **Yaqut (Red Team):** boleh uji form dengan payload XSS. Gunakan `<script>alert(1)</script>` di kolom nama (form Admin) dan alasan revisi.
- **Hana (Writer):** jalankan mode demo (bagian 6) untuk mengambil screenshot semua halaman.

---

## 6. Cara Menjalankan

```bash
npm install

# Mode demo tanpa backend (untuk screenshot / presentasi)
# login: mhs / dosen / kaprodi / kajur / admin, password: password123
VITE_USE_MOCK=true npm run dev      # Windows PowerShell: $env:VITE_USE_MOCK="true"; npm run dev

# Mode normal (butuh backend di http://localhost:3000)
npm run dev
```

Buka `http://localhost:5173`. Di mode normal, request `/api/*` diteruskan (proxy) ke backend di port 3000; ubah target di `vite.config.js` jika berbeda.

---

## 7. Asumsi Endpoint API (perlu disinkronkan dengan Dimas)

| Fungsi | Endpoint |
|---|---|
| Login / sesi / logout | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Mahasiswa | `GET /mahasiswa/kelas`, `GET /mahasiswa/krs`, `POST /mahasiswa/krs` (body `kelas_ids`, `submit`), `GET /mahasiswa/khs` |
| Dosen Wali | `GET /dosen/wali/mahasiswa`, `POST /dosen/wali/krs/:id/acc` |
| Dosen Pengampu | `GET /dosen/pengampu/kelas`, `GET /dosen/pengampu/kelas/:id/nilai`, `PUT /dosen/nilai/:id`, `POST /dosen/pengampu/kelas/:id/kunci`, `POST /dosen/koreksi` (body `nilai_id`, `nilai_baru`, `alasan`) |
| Kaprodi | `GET /kaprodi/rekap`, `GET /kaprodi/tiket`, `POST /kaprodi/tiket/:id/review` (body `rekomendasi`) |
| Kajur | `GET /kajur/statistik`, `GET /kajur/tiket`, `POST /kajur/tiket/:id/keputusan` (body `setuju`) |
| Admin | `GET/POST /admin/users`, `GET/POST /admin/mata-kuliah`, `GET/POST /admin/kelas`, `PUT /admin/kelas/:id/dosen`, `GET /admin/tiket`, `POST /admin/tiket/:id/eksekusi`, `GET/PUT /admin/krs-periode` |

Status tiket dan KRS adalah string; pastikan nilainya sama dengan enum di database (`draft/submitted/approved` dan `menunggu_review/direkomendasikan/disetujui_kajur/dieksekusi/ditolak`). Jika Dimas memakai nama berbeda, ubah di file halaman dan di `src/api/mock.js`.

---

## 8. Kemungkinan Pertanyaan Ketua & Jawabannya

**Apakah frontend saja sudah cukup aman?**
Tidak, dan memang bukan itu klaimnya. Frontend adalah lapisan pertama (cegah XSS, cegah salah input, UX jelas). Penegakan hak akses, validasi data, dan penolakan edit nilai terkunci tetap tugas backend.

**Kenapa token tidak di localStorage?**
localStorage bisa dibaca skrip apa pun di halaman. Jika ada celah XSS, token bisa dicuri. Cookie HttpOnly tidak bisa dibaca JavaScript.

**Bagaimana kalau ada yang akses URL role lain?**
`ProtectedRoute` menampilkan 403. Kalaupun dilewati, API backend menolak karena role tidak sesuai.

**Bagaimana membuktikan tidak ada XSS?**
Data mock memuat payload XSS. Saat dirender, tampil sebagai teks. Yaqut juga akan menguji manual.

**Kenapa ada mode mock?**
Supaya UI bisa didemokan dan di-screenshot (untuk Hana) tanpa menunggu backend. Mode ini hanya aktif jika `VITE_USE_MOCK=true`.

---

## 9. Catatan Jujur / Batasan

- Kode sudah diperiksa sintaksnya, tetapi **belum dijalankan di browser** (lingkungan saya tidak bisa `npm install`). Jalankan `npm install` lalu `npm run dev` dan cek setiap halaman; jika ada galat, kabari saya.
- Nama endpoint dan field JSON adalah asumsi sampai disinkronkan dengan Dimas.
- Batas 24 SKS adalah contoh.
- Content Security Policy (CSP) sebaiknya dipasang backend sebagai header HTTP saat produksi sebagai lapisan anti-XSS tambahan.
