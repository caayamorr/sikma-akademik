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
