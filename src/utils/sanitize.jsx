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
