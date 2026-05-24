"use client";
import { useState, useEffect } from "react";

const BACKEND = "https://3cfe-140-213-187-76.ngrok-free.app";

export default function LaporanPage() {
  const [daftarLaporan, setDaftarLaporan] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const jenisSuratMaster = [
    "SURAT KETERANGAN KELAHIRAN", "SURAT KETERANGAN KEMATIAN", "SURAT KETERANGAN USAHA",
    "SURAT KETERANGAN DOMISILI", "SURAT KETERANGAN BELUM PERNAH NIKAH", "SURAT KETERANGAN SUDAH MENIKAH",
    "SURAT KETERANGAN KEPEMILIKAN KENDARAAN", "SURAT KETERANGAN CATATAN KEPOLISIAN", "SURAT KETERANGAN PENDUDUK",
    "SURAT KETERANGAN PENGANTAR BBM", "SURAT KETERANGAN PENGHASILAN", "SURAT KETERANGAN TIDAK MAMPU",
    "SURAT KETERANGAN KEHILANGAN", "SURAT KETERANGAN UMUM / YANMA", "SURAT KETERANGAN BEPERGIAN",
    "SURAT PERNYATAAN DAN KUASA", "SURAT DINAS KELUAR", "SURAT DINAS DATANG", "YAMKESMASKIN"
  ];

  useEffect(() => {
    fetchDanHitungLaporan();
  }, []);

  const fetchDanHitungLaporan = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/surat`, {
        cache: "no-store",
        headers: { "ngrok-skip-browser-warning": "69420" }
      });
      if (!res.ok) throw new Error();
      const dataSurat = await res.json();

      const rekapLaporan = jenisSuratMaster.map((jenis, index) => {
        const total = dataSurat.filter(s => s.jenis_surat === jenis).length;
        return {
          no: index + 1,
          jenis: jenis,
          total: total,
          masuk: total > 0 && !jenis.toLowerCase().includes("keluar") ? total : 0,
          keluar: total > 0 && jenis.toLowerCase().includes("keluar") ? total : 0,
          status: "Stabil"
        };
      });
      setDaftarLaporan(rekapLaporan);
    } catch {
      setDaftarLaporan(jenisSuratMaster.map((jenis, index) => ({
        no: index + 1, jenis: jenis, total: 0, masuk: 0, keluar: 0, status: "Stabil"
      })));
    } finally {
      setIsLoading(false);
    }
  };

  // FUNGSI SAKTI: Memerintahkan robot cloud untuk auto-write ke Spreadsheet link
  const handleSinkronisasiSheets = async (tipe) => {
    setIsSyncing(true);
    try {
      const url = tipe 
        ? `${BACKEND}/api/surat/export/sheets?tipe=${tipe}`
        : `${BACKEND}/api/surat/export/sheets`;

      const res = await fetch(url, {
        method: "POST", // Metode POST agar aman mengirim perintah ekspor
        headers: { "ngrok-skip-browser-warning": "69420" }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Gagal sinkronisasi.");
      }

      const hasil = await res.json();
      alert(`✅ ${hasil.pesan}`);
    } catch (error) {
      alert("❌ Robot Google Cloud Gagal Menulis: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TABEL REKAP ARSIP */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border bg-latar/50">
          <h2 className="text-base font-bold text-hitam">Statistik Berdasarkan Jenis Surat</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[800px]">
            <thead className="bg-latar border-b border-border">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-abu uppercase tracking-wider w-16">NO</th>
                <th className="px-6 py-4 text-xs font-bold text-abu uppercase tracking-wider">JENIS SURAT</th>
                <th className="px-6 py-4 text-xs font-bold text-abu uppercase tracking-wider text-center">SURAT MASUK</th>
                <th className="px-6 py-4 text-xs font-bold text-abu uppercase tracking-wider text-center">SURAT KELUAR</th>
                <th className="px-6 py-4 text-xs font-bold text-abu uppercase tracking-wider text-center">TOTAL</th>
                <th className="px-6 py-4 text-xs font-bold text-abu uppercase tracking-wider text-center">TREN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-sm text-abu">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin text-hijau" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Menghitung rekapitulasi data arsip...
                    </div>
                  </td>
                </tr>
              ) : daftarLaporan.map((row) => (
                <tr key={row.no} className="hover:bg-latar/50 transition-colors">
                  <td className="px-6 py-3.5 font-bold text-abu">{row.no}</td>
                  <td className="px-6 py-3.5 font-semibold text-hitam text-xs sm:text-sm">{row.jenis}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-biru">{row.masuk}</td>
                  <td className="px-6 py-3.5 text-center font-bold text-emas">{row.keluar}</td>
                  <td className="px-6 py-3.5 text-center font-black text-hijau-tua">{row.total}</td>
                  <td className="px-6 py-3.5 text-center">
                    <span className="px-2.5 py-1 bg-hijau-pale text-hijau-tua text-xs font-bold rounded-lg border border-hijau/20">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL UTAMA BACKUP CLOUD SPREADSHEET */}
      <div className="bg-white border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-hitam">Backup & Ekspor Cloud Spreadsheet</h2>
          <p className="text-xs text-abu mt-0.5">Perintahkan Robot Google Cloud untuk menulis ulang rekap database langsung ke link Google Spreadsheet secara otomatis.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <button
            onClick={() => handleSinkronisasiSheets(null)}
            disabled={isSyncing}
            className="bg-hijau-tua hover:bg-hijau text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {isSyncing ? "Menulis ke Cloud..." : "Backup Semua Surat"}
          </button>

          <button
            onClick={() => handleSinkronisasiSheets("masuk")}
            disabled={isSyncing}
            className="bg-white border border-border text-hitam hover:bg-latar px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Backup Surat Masuk
          </button>

          <button
            onClick={() => handleSinkronisasiSheets("keluar")}
            disabled={isSyncing}
            className="bg-white border border-border text-hitam hover:bg-latar px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Backup Surat Keluar
          </button>
        </div>
      </div>

    </div>
  );
}