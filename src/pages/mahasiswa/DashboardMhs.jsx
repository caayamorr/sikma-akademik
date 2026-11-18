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
