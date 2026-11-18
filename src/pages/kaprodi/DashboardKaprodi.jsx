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
