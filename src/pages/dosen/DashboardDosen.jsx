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
