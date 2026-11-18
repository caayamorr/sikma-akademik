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
