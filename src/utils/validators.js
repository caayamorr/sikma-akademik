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
