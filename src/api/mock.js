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
