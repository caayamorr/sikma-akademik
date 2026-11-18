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
