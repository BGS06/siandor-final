"use client";
import { useState, useEffect } from "react";

const BACKEND = "https://0c9f-140-213-187-76.ngrok-free.app";

export default function DashboardPage() {
  const [statistik, setStatistik] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStatistik();
  }, []);

  const fetchStatistik = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/statistik`, { 
        cache: "no-store",
        headers: {
          "ngrok-skip-browser-warning": "69420"
        }
      }); 
      if (res.ok) {
        const data = await res.json();
        setStatistik(data);
      } else {
        console.error("Gagal mengambil data dari server");
      }
    } catch (error) {
      console.error("Error koneksi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-hitam flex items-center gap-2">
          Selamat datang, Admin <span className="animate-wave origin-bottom-right">👋</span>
        </h1>
        <p className="text-abu text-sm mt-1">Ringkasan cepat arsip Desa Ngrandulor.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
          <div className="text-4xl font-black text-hitam mb-2">
            {isLoading ? "..." : (statistik?.total_surat || 0)}
          </div>
          <div className="text-sm font-medium text-abu">Total Surat Tersimpan</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
          <div className="text-3xl font-black text-hitam mb-2">
            {isLoading ? "..." : (statistik?.total_masuk || 0)}
          </div>
          <div className="text-sm font-medium text-abu">Surat Masuk ({currentYear})</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
          <div className="text-3xl font-black text-hitam mb-2">
            {isLoading ? "..." : (statistik?.total_keluar || 0)}
          </div>
          <div className="text-sm font-medium text-abu">Surat Keluar ({currentYear})</div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-bold text-hitam">Surat Terbaru</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-latar border-b border-border">
              <tr>
                <th className="px-5 py-4 text-xs font-bold text-abu uppercase tracking-wider">NO AGENDA</th>
                <th className="px-5 py-4 text-xs font-bold text-abu uppercase tracking-wider">NAMA / ASAL</th>
                <th className="px-5 py-4 text-xs font-bold text-abu uppercase tracking-wider">PERIHAL</th>
                <th className="px-5 py-4 text-xs font-bold text-abu uppercase tracking-wider">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-sm text-abu">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin text-hijau" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : statistik?.terbaru && statistik.terbaru.length > 0 ? (
                statistik.terbaru.map((surat, index) => (
                  <tr key={index} className="border-b border-border hover:bg-latar transition-colors last:border-0">
                    <td className="px-5 py-4 text-sm font-bold text-hijau-tua">{surat.agenda}</td>
                    <td className="px-5 py-4 text-sm font-medium text-hitam">{surat.asal}</td>
                    <td className="px-5 py-4 text-sm text-hitam">{surat.perihal}</td>
                    <td className="px-5 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${surat.status === "Selesai" ? "bg-hijau-pale text-hijau-tua" : "bg-emas-pale text-[#7A5400]"}`}>
                        {surat.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-5 py-10 text-center text-sm text-abu">
                    Belum ada data surat di database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}