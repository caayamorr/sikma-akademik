import { useState } from "react";
import { bersihkanTeks } from "../utils/sanitize";
import { validasiKoreksi, validasiNilai } from "../utils/validators";

/**
 * Baris input nilai dengan indikator kunci (State Lock) - sesuai laporan RBAC.
 *
 * Belum dikunci (status_kunci = false):
 *  - Dosen Pengampu boleh input / ubah nilai ("Simpan Draf").
 * Sudah dikunci (status_kunci = true):
 *  - input dinonaktifkan, tampil badge "Terkunci Permanen".
 *  - perubahan HANYA lewat tiket eskalasi: Dosen mengajukan koreksi, lalu
 *    Kaprodi (review awal) -> Kajur (final approval) -> Admin (eksekusi buka kunci).
 * Ini hanya membantu UX; backend tetap WAJIB menolak perubahan pada nilai terkunci
 * dan mengecek kelas.dosen_id = user.id.
 *
 * item.nama_mahasiswa dirender sebagai teks murni -> payload XSS tampil sebagai teks.
 */
export default function GradeInputRow({ item, onSave, onKoreksi }) {
  const isLocked = item.status_kunci === true;
  const [nilai, setNilai] = useState(item.nilai_angka ?? "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form pengajuan koreksi (hanya untuk nilai terkunci)
  const [bukaKoreksi, setBukaKoreksi] = useState(false);
  const [nilaiBaru, setNilaiBaru] = useState("");
  const [alasan, setAlasan] = useState("");
  const [errKoreksi, setErrKoreksi] = useState({});

  async function simpan() {
    const err = validasiNilai(nilai);
    setError(err);
    if (err) return;
    setSaving(true);
    try {
      await onSave(item, Number(nilai));
    } finally {
      setSaving(false);
    }
  }

  async function kirimKoreksi() {
    const alasanBersih = bersihkanTeks(alasan);
    const v = validasiKoreksi(nilaiBaru, alasanBersih);
    setErrKoreksi(v);
    if (Object.keys(v).length > 0) return;
    setSaving(true);
    try {
      const berhasil = await onKoreksi(item, Number(nilaiBaru), alasanBersih);
      if (berhasil) {
        setBukaKoreksi(false);
        setNilaiBaru("");
        setAlasan("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr className={isLocked ? "bg-slate-100 opacity-80" : ""}>
        <td className="td">{item.nama_mahasiswa}</td>
        <td className="td">
          <input
            type="number"
            min={0}
            max={100}
            value={nilai}
            onChange={(e) => setNilai(e.target.value)}
            disabled={isLocked}
            aria-label={`Nilai ${item.nama_mahasiswa}`}
            className="border p-1 w-24 rounded disabled:bg-slate-200"
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </td>
        <td className="td">
          {isLocked ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold">
                Terkunci Permanen
              </span>
              {onKoreksi && (
                <button className="btn-secondary text-xs" onClick={() => setBukaKoreksi((b) => !b)}>
                  {bukaKoreksi ? "Batal" : "Ajukan Koreksi"}
                </button>
              )}
            </div>
          ) : (
            <button className="btn-primary text-xs" onClick={simpan} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Draf"}
            </button>
          )}
        </td>
      </tr>

      {isLocked && bukaKoreksi && (
        <tr className="bg-yellow-50">
          <td className="td" colSpan={3}>
            <p className="text-sm font-semibold mb-2">
              Ajukan Koreksi Nilai (eskalasi ke Kaprodi, lalu Kajur, lalu Admin)
            </p>
            <div className="flex flex-wrap gap-3 items-start">
              <div>
                <label className="block text-xs mb-1" htmlFor={`nb-${item.id}`}>Nilai baru (0-100)</label>
                <input
                  id={`nb-${item.id}`}
                  type="number"
                  min={0}
                  max={100}
                  value={nilaiBaru}
                  onChange={(e) => setNilaiBaru(e.target.value)}
                  className="border p-1 w-28 rounded"
                />
                {errKoreksi.nilai && <p className="text-xs text-red-600 mt-1">{errKoreksi.nilai}</p>}
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs mb-1" htmlFor={`al-${item.id}`}>Alasan revisi</label>
                <textarea
                  id={`al-${item.id}`}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="border p-1 w-full rounded"
                />
                {errKoreksi.alasan && <p className="text-xs text-red-600 mt-1">{errKoreksi.alasan}</p>}
              </div>
              <button className="btn-primary text-xs mt-5" onClick={kirimKoreksi} disabled={saving}>
                {saving ? "Mengirim..." : "Kirim Tiket"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
