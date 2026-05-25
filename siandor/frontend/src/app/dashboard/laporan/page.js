"use client";
import { useState, useEffect } from "react";

const BACKEND = "https://0c9f-140-213-187-76.ngrok-free.app";

export default function LaporanPage() {
  const [statsData, setStatsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Daftar urutan surat sesuai form
  const masterJenisSurat = [
    "SURAT KETERANGAN KELAHIRAN", "SURAT KETERANGAN KEMATIAN", "SURAT KETERANGAN USAHA",
    "SURAT KETERANGAN DOMISILI", "SURAT KETERANGAN BELUM PERNAH NIKAH", "SURAT KETERANGAN SUDAH MENIKAH",
    "SURAT KETERANGAN KEPEMILIKAN KENDARAAN", "SURAT KETERANGAN CATATAN KEPOLISIAN", "SURAT KETERANGAN PENDUDUK",
    "SURAT KETERANGAN PENGANTAR BBM", "SURAT KETERANGAN PENGHASILAN", "SURAT KETERANGAN TIDAK MAMPU",
    "SURAT KETERANGAN KEHILANGAN", "SURAT KETERANGAN UMUM / YANMA", "SURAT KETERANGAN BEPERGIAN",
    "SURAT PERNYATAAN DAN KUASA", "SURAT DINAS KELUAR", "SURAT DINAS DATANG", "YAMKESMASKIN"
  ];

  useEffect(() => {
    fetchLaporan();
  }, []);

  const fetchLaporan = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/surat`, {
        cache: "no-store",
        headers: { "ngrok-skip-browser-warning": "69420" }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Inisialisasi data statistik (semua 0)
      let statsMap = {};
      masterJenisSurat.forEach(jenis => {
        statsMap[jenis] = { jenis, masuk: 0, keluar: 0, total: 0 };
      });

      // Proses setiap surat dari database
      data.forEach(item => {
        const rawJenis = item.jenis_surat || "";
        const jenisLower = rawJenis.toLowerCase();

        // 1. Cek Tag Kategori (Dari Dropdown Form)
        let tipe = "masuk";
        if (jenisLower.includes("[keluar]")) {
          tipe = "keluar";
        } else if (jenisLower.includes("[masuk]")) {
          tipe = "masuk";
        } else {
          // Backup jika ada data lama yang belum ditag
          const kataKunciKeluar = ["keluar", "keterangan", "pengantar", "rekomendasi"];
          tipe = kataKunciKeluar.some(kata => jenisLower.includes(kata)) ? "keluar" : "masuk";
        }

        // 2. Bersihkan nama surat dari Tag agar cocok dengan tabel
        let cleanJenis = rawJenis.replace(/\[KELUAR\]\s?/gi, "").replace(/\[MASUK\]\s?/gi, "").trim();
        // Paksa jadi uppercase agar sama persis
        cleanJenis = cleanJenis.toUpperCase();

        // Jika entah kenapa ada surat aneh di luar list, kita tambahkan baris baru
        if (!statsMap[cleanJenis]) {
          statsMap[cleanJenis] = { jenis: cleanJenis, masuk: 0, keluar: 0, total: 0 };
        }

        // 3. Tambahkan ke hitungan tabel
        if (tipe === "keluar") {
          statsMap[cleanJenis].keluar += 1;
        } else {
          statsMap[cleanJenis].masuk += 1;
        }
        statsMap[cleanJenis].total += 1;
      });

      // Ubah dari Object ke Array agar bisa di-map di HTML
      // Menggunakan urutan dari masterJenisSurat, plus jenis surat custom (jika ada) di akhir
      const finalStats = Object.values(statsMap);
      setStatsData(finalStats);

    } catch (error) {
      console.error("Gagal load laporan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-hitam">Statistik Berdasarkan Jenis Surat</h2>
          <button onClick={() => window.print()} className="px-5 py-2.5 bg-white border border-border text-hitam rounded-xl font-bold text-sm hover:bg-latar shadow-sm transition cursor-pointer flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Cetak Laporan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[900px]">
            <thead className="bg-latar border-b border-border">
              <tr>
                <th className="py-4 px-4 text-xs font-bold text-abu uppercase w-12 text-center">No</th>
                <th className="py-4 px-4 text-xs font-bold text-abu uppercase">Jenis Surat</th>
                <th className="py-4 px-4 text-xs font-bold text-abu uppercase text-center w-32">Surat Masuk</th>
                <th className="py-4 px-4 text-xs font-bold text-abu uppercase text-center w-32">Surat Keluar</th>
                <th className="py-4 px-4 text-xs font-bold text-abu uppercase text-center w-24">Total</th>
                <th className="py-4 px-4 text-xs font-bold text-abu uppercase text-center w-28">Tren</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-sm text-abu">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin text-hijau" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Memuat data statistik...
                    </div>
                  </td>
                </tr>
              ) : (
                statsData.map((item, index) => (
                  <tr key={index} className="hover:bg-latar transition-colors">
                    <td className="py-4 px-4 font-bold text-abu text-center">{index + 1}</td>
                    <td className="py-4 px-4 font-semibold text-hitam">{item.jenis}</td>
                    <td className="py-4 px-4 text-center font-bold text-biru">{item.masuk}</td>
                    <td className="py-4 px-4 text-center font-bold text-emas">{item.keluar}</td>
                    <td className="py-4 px-4 text-center font-black text-hitam">{item.total}</td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7] rounded-full text-xs font-bold">
                        Stabil
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}