import { useEffect, useState } from "react";
import api from "../../api/client";
import Alert from "../../components/ErrorAlert";
import StatusTiket from "../../components/StatusTiket";
import { bersihkanTeks } from "../../utils/sanitize";
import {
  ROLES,
  cekAturanPassword,
  kekuatanPassword,
  validasiAkun,
  validasiKelas,
  validasiMataKuliah,
} from "../../utils/validators";

const FORM_AKUN = { username: "", nama: "", role: "mahasiswa", password: "" };
const FORM_MK = { kode: "", nama: "", sks: 3 };
const FORM_KELAS = { mata_kuliah_id: "", jadwal: "", kuota: 40 };
const LABEL_ROLE = { admin: "Admin", mahasiswa: "Mahasiswa", dosen: "Dosen", kaprodi: "Kaprodi", kajur: "Kajur" };

/**
 * Dashboard Admin (RBAC laporan):
 *  users, mata_kuliah, kelas: CRUD penuh (akun civitas, master kurikulum, buka kelas)
 *  krs_detail: hanya update status_kunci, yaitu EKSEKUSI teknis buka kunci setelah Final Approval Kajur.
 * Admin DILARANG mengubah nilai mahasiswa sepihak: tidak ada form nilai di halaman ini.
 */
export default function DashboardAdmin() {
  const [users, setUsers] = useState([]);
  const [mk, setMk] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [tiket, setTiket] = useState([]);
  const [periode, setPeriode] = useState(null);
  const [formAkun, setFormAkun] = useState(FORM_AKUN);
  const [formMk, setFormMk] = useState(FORM_MK);
  const [formKelas, setFormKelas] = useState(FORM_KELAS);
  const [errAkun, setErrAkun] = useState({});
  const [errMk, setErrMk] = useState({});
  const [errKelas, setErrKelas] = useState({});
  const [pesan, setPesan] = useState({ type: "error", teks: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/users"),
      api.get("/admin/mata-kuliah"),
      api.get("/admin/kelas"),
      api.get("/admin/tiket"),
      api.get("/admin/krs-periode"),
    ])
      .then(([u, m, k, t, p]) => {
        setUsers(u.data);
        setMk(m.data);
        setKelas(k.data);
        setTiket(t.data);
        setPeriode(p.data);
      })
      .catch((e) => setPesan({ type: "error", teks: e.userMessage }))
      .finally(() => setLoading(false));
  }, []);

  const daftarDosen = users.filter((u) => u.role === "dosen");
  const ok = (teks) => setPesan({ type: "success", teks });
  const gagal = (e) => setPesan({ type: "error", teks: e.userMessage });

  /* ---- Manajemen akun (5 role) ---- */
  async function tambahAkun(e) {
    e.preventDefault();
    const bersih = {
      username: bersihkanTeks(formAkun.username),
      nama: bersihkanTeks(formAkun.nama),
      role: formAkun.role,
      password: formAkun.password,
    };
    const v = validasiAkun(bersih);
    setErrAkun(v);
    if (Object.keys(v).length) return;
    try {
      const res = await api.post("/admin/users", bersih);
      setUsers((u) => [...u, res.data]);
      setFormAkun(FORM_AKUN);
      ok("Akun berhasil dibuat.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Master kurikulum (mata kuliah) ---- */
  async function tambahMk(e) {
    e.preventDefault();
    const bersih = { kode: bersihkanTeks(formMk.kode).toUpperCase(), nama: bersihkanTeks(formMk.nama), sks: Number(formMk.sks) };
    const v = validasiMataKuliah(bersih);
    setErrMk(v);
    if (Object.keys(v).length) return;
    try {
      const res = await api.post("/admin/mata-kuliah", bersih);
      setMk((m) => [...m, res.data]);
      setFormMk(FORM_MK);
      ok("Mata kuliah ditambahkan ke master kurikulum.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Pembukaan kelas ---- */
  async function bukaKelas(e) {
    e.preventDefault();
    const bersih = {
      mata_kuliah_id: Number(formKelas.mata_kuliah_id),
      jadwal: bersihkanTeks(formKelas.jadwal),
      kuota: Number(formKelas.kuota),
    };
    const v = validasiKelas(bersih);
    setErrKelas(v);
    if (Object.keys(v).length) return;
    try {
      const res = await api.post("/admin/kelas", bersih);
      setKelas((k) => [...k, res.data]);
      setFormKelas(FORM_KELAS);
      ok("Kelas berhasil dibuka. Tugaskan dosen pengampu di tabel kelas.");
    } catch (err) {
      gagal(err);
    }
  }

  async function tugaskan(kelasId, dosenId) {
    if (!dosenId) return;
    try {
      const res = await api.put(`/admin/kelas/${kelasId}/dosen`, { dosen_id: Number(dosenId) });
      setKelas((list) => list.map((k) => (k.id === kelasId ? res.data : k)));
      ok("Dosen pengampu berhasil ditugaskan.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Eksekusi teknis buka kunci nilai (pasca Final Approval Kajur) ---- */
  async function eksekusi(t) {
    if (!window.confirm("Eksekusi pembukaan kunci nilai ini? Tindakan tercatat di audit log.")) return;
    try {
      await api.post(`/admin/tiket/${t.id}/eksekusi`);
      setTiket((list) => list.map((x) => (x.id === t.id ? { ...x, status: "dieksekusi" } : x)));
      ok("Kunci nilai dibuka. Dosen pengampu kini dapat mengoreksi nilai.");
    } catch (err) {
      gagal(err);
    }
  }

  /* ---- Masa aktif KRS ---- */
  async function simpanPeriode(e) {
    e.preventDefault();
    if (periode.mulai && periode.selesai && periode.mulai > periode.selesai) {
      return setPesan({ type: "error", teks: "Tanggal mulai tidak boleh setelah tanggal selesai." });
    }
    try {
      const res = await api.put("/admin/krs-periode", periode);
      setPeriode(res.data);
      ok("Pengaturan masa KRS disimpan.");
    } catch (err) {
      gagal(err);
    }
  }

  if (loading) return <p className="text-slate-500">Memuat data...</p>;

  const kuat = kekuatanPassword(formAkun.password);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard Administrator</h2>
      <Alert type={pesan.type} pesan={pesan.teks} />

      {/* Eksekusi buka kunci nilai */}
      <section className="card overflow-x-auto">
        <h3 className="font-semibold mb-1">Eksekusi Teknis Buka Kunci Nilai</h3>
        <p className="text-sm text-slate-500 mb-3">
          Hanya tiket yang sudah disetujui Kajur yang dapat dieksekusi. Admin tidak dapat mengubah nilai mahasiswa sepihak.
        </p>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Kelas</th>
              <th className="th">Mahasiswa</th>
              <th className="th">Revisi</th>
              <th className="th">Status</th>
              <th className="th">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tiket.map((t) => (
              <tr key={t.id}>
                <td className="td">{t.kelas}</td>
                <td className="td">{t.mahasiswa}</td>
                <td className="td">{t.nilai_lama} → {t.nilai_baru}</td>
                <td className="td"><StatusTiket status={t.status} /></td>
                <td className="td">
                  <button className="btn-danger text-xs" disabled={t.status !== "disetujui_kajur"} onClick={() => eksekusi(t)}>
                    Buka Kunci
                  </button>
                </td>
              </tr>
            ))}
            {tiket.length === 0 && (
              <tr>
                <td className="td text-slate-500" colSpan={5}>Tidak ada tiket yang perlu dieksekusi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Master kurikulum */}
      <section className="card">
        <h3 className="font-semibold mb-3">Master Kurikulum (Mata Kuliah)</h3>
        <form onSubmit={tambahMk} noValidate className="grid sm:grid-cols-4 gap-3 items-start mb-4">
          <div>
            <input className="input" placeholder="Kode (mis. IF106)" value={formMk.kode} onChange={(e) => setFormMk({ ...formMk, kode: e.target.value })} aria-label="Kode mata kuliah" />
            {errMk.kode && <p className="text-xs text-red-600 mt-1">{errMk.kode}</p>}
          </div>
          <div>
            <input className="input" placeholder="Nama mata kuliah" value={formMk.nama} onChange={(e) => setFormMk({ ...formMk, nama: e.target.value })} aria-label="Nama mata kuliah" />
            {errMk.nama && <p className="text-xs text-red-600 mt-1">{errMk.nama}</p>}
          </div>
          <div>
            <input className="input" type="number" min={1} max={6} value={formMk.sks} onChange={(e) => setFormMk({ ...formMk, sks: e.target.value })} aria-label="SKS" />
            {errMk.sks && <p className="text-xs text-red-600 mt-1">{errMk.sks}</p>}
          </div>
          <button className="btn-primary py-2" type="submit">Tambah Mata Kuliah</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Kode</th>
                <th className="th">Mata Kuliah</th>
                <th className="th">SKS</th>
              </tr>
            </thead>
            <tbody>
              {mk.map((m) => (
                <tr key={m.id}>
                  <td className="td">{m.kode}</td>
                  <td className="td">{m.nama}</td>
                  <td className="td">{m.sks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Buka kelas + penugasan dosen */}
      <section className="card">
        <h3 className="font-semibold mb-3">Pembukaan Kelas & Penugasan Dosen</h3>
        <form onSubmit={bukaKelas} noValidate className="grid sm:grid-cols-4 gap-3 items-start mb-4">
          <div>
            <select className="input" value={formKelas.mata_kuliah_id} onChange={(e) => setFormKelas({ ...formKelas, mata_kuliah_id: e.target.value })} aria-label="Mata kuliah">
              <option value="">-- pilih mata kuliah --</option>
              {mk.map((m) => (
                <option key={m.id} value={m.id}>{m.kode} - {m.nama}</option>
              ))}
            </select>
            {errKelas.mata_kuliah_id && <p className="text-xs text-red-600 mt-1">{errKelas.mata_kuliah_id}</p>}
          </div>
          <div>
            <input className="input" placeholder="Jadwal (mis. Senin 08:00)" value={formKelas.jadwal} onChange={(e) => setFormKelas({ ...formKelas, jadwal: e.target.value })} aria-label="Jadwal" />
            {errKelas.jadwal && <p className="text-xs text-red-600 mt-1">{errKelas.jadwal}</p>}
          </div>
          <div>
            <input className="input" type="number" min={1} max={200} value={formKelas.kuota} onChange={(e) => setFormKelas({ ...formKelas, kuota: e.target.value })} aria-label="Kuota" />
            {errKelas.kuota && <p className="text-xs text-red-600 mt-1">{errKelas.kuota}</p>}
          </div>
          <button className="btn-primary py-2" type="submit">Buka Kelas</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Kode</th>
                <th className="th">Mata Kuliah</th>
                <th className="th">Jadwal</th>
                <th className="th">Kuota</th>
                <th className="th">Dosen Pengampu</th>
                <th className="th">Ganti Dosen</th>
              </tr>
            </thead>
            <tbody>
              {kelas.map((k) => (
                <tr key={k.id}>
                  <td className="td">{k.kode}</td>
                  <td className="td">{k.nama}</td>
                  <td className="td">{k.jadwal}</td>
                  <td className="td">{k.kuota}</td>
                  <td className="td">{k.dosen_nama ?? <em className="text-slate-400">Belum ditugaskan</em>}</td>
                  <td className="td">
                    <select className="border rounded px-2 py-1" value="" onChange={(e) => tugaskan(k.id, e.target.value)} aria-label={`Pilih dosen untuk ${k.nama}`}>
                      <option value="">-- pilih dosen --</option>
                      {daftarDosen.map((d) => (
                        <option key={d.id} value={d.id}>{d.nama}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Manajemen akun */}
      <section className="card">
        <h3 className="font-semibold mb-3">Manajemen Akun Civitas (5 Role)</h3>
        <form onSubmit={tambahAkun} noValidate className="grid sm:grid-cols-5 gap-3 items-start mb-5">
          <div>
            <input className="input" placeholder="Username" value={formAkun.username} onChange={(e) => setFormAkun({ ...formAkun, username: e.target.value })} aria-label="Username" />
            {errAkun.username && <p className="text-xs text-red-600 mt-1">{errAkun.username}</p>}
          </div>
          <div>
            <input className="input" placeholder="Nama lengkap" value={formAkun.nama} onChange={(e) => setFormAkun({ ...formAkun, nama: e.target.value })} aria-label="Nama lengkap" />
            {errAkun.nama && <p className="text-xs text-red-600 mt-1">{errAkun.nama}</p>}
          </div>
          <div>
            <select className="input" value={formAkun.role} onChange={(e) => setFormAkun({ ...formAkun, role: e.target.value })} aria-label="Role">
              {ROLES.map((r) => (
                <option key={r} value={r}>{LABEL_ROLE[r]}</option>
              ))}
            </select>
            {errAkun.role && <p className="text-xs text-red-600 mt-1">{errAkun.role}</p>}
          </div>
          <div>
            <input className="input" type="password" placeholder="Password (kuat)" value={formAkun.password} onChange={(e) => setFormAkun({ ...formAkun, password: e.target.value })} autoComplete="new-password" aria-label="Password" />
            {/* [MODUL VI] Indikator kekuatan + daftar aturan password policy */}
            {formAkun.password && (
              <div className="mt-2" aria-live="polite">
                <div className="h-1.5 bg-slate-200 rounded">
                  <div className={`h-1.5 rounded ${kuat.warna}`} style={{ width: kuat.lebar }} />
                </div>
                <p className="text-xs mt-1">Kekuatan: <strong>{kuat.teks}</strong></p>
                <ul className="text-xs mt-1 space-y-0.5">
                  {cekAturanPassword(formAkun.password).map((a) => (
                    <li key={a.label} className={a.ok ? "text-green-700" : "text-slate-500"}>
                      {a.ok ? "✓" : "○"} {a.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {errAkun.password && <p className="text-xs text-red-600 mt-1">{errAkun.password}</p>}
          </div>
          <button className="btn-primary py-2" type="submit">Tambah Akun</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Username</th>
                <th className="th">Nama</th>
                <th className="th">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="td">{u.username}</td>
                  <td className="td">{u.nama}</td>
                  <td className="td">{LABEL_ROLE[u.role] ?? u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Masa aktif KRS */}
      {periode && (
        <section className="card">
          <h3 className="font-semibold mb-3">Pengaturan Masa Aktif Pengisian KRS</h3>
          <form onSubmit={simpanPeriode} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm mb-1" htmlFor="mulai">Mulai</label>
              <input id="mulai" type="date" className="input" value={periode.mulai} onChange={(e) => setPeriode({ ...periode, mulai: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm mb-1" htmlFor="selesai">Selesai</label>
              <input id="selesai" type="date" className="input" value={periode.selesai} onChange={(e) => setPeriode({ ...periode, selesai: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" checked={periode.aktif} onChange={(e) => setPeriode({ ...periode, aktif: e.target.checked })} />
              Pengisian KRS aktif
            </label>
            <button className="btn-primary" type="submit">Simpan</button>
          </form>
        </section>
      )}
    </div>
  );
}
