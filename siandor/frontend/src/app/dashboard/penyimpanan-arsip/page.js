"use client";
import { useState, useEffect } from "react";

const BACKEND = "https://84ae-118-99-84-100.ngrok-free.app";

export default function PenyimpananArsipPage() {
  const [semuaArsip, setSemuaArsip] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipe, setFilterTipe] = useState("semua"); 
  const [isLoading, setIsLoading] = useState(true);

  const fetchSemuaArsip = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/surat`, { 
        cache: "no-store",
        headers: {
          "ngrok-skip-browser-warning": "69420"
        }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      const formattedData = data.map(item => ({
        id: item.id,
        agenda: item.no_agenda,
        jenis: item.jenis_surat,
        asal: item.nama_pemohon,
        perihal: item.perihal,
        nik: item.nik || "-",
        no: item.no_surat_asli || "-",
        tgl: item.tanggal,
        disp: item.disposisi,
        status: item.status,
        file_path: item.file_path,
        tipe: item.jenis_surat.toLowerCase().includes("keluar") ? "keluar" : "masuk"
      }));

      setSemuaArsip(formattedData);
    } catch {
      setSemuaArsip([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSemuaArsip();
  }, []);

  const filteredData = semuaArsip.filter((row) => {
    const matchSearch = [row.agenda, row.asal, row.perihal, row.jenis].join(" ").toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipe = filterTipe === "semua" ? true : row.tipe === filterTipe;
    return matchSearch && matchTipe;
  });

  const totalArsip = semuaArsip.length;
  const suratMasuk = semuaArsip.filter(s => s.tipe === "masuk").length;
  const suratKeluar = semuaArsip.filter(s => s.tipe === "keluar").length;
  const adaFile = semuaArsip.filter(s => s.file_path).length;

  const handleBackupExcel = async () => {
    try {
      // 1. Kita ambil file pakai fetch agar bisa menyusupkan kode rahasia Ngrok
      const res = await fetch(`${BACKEND}/api/surat/export/excel`, {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "69420" // Kunci agar Ngrok tidak mencegat
        }
      });

      if (!res.ok) throw new Error("Gagal mengunduh file");

      // 2. Ubah data yang ditangkap menjadi bentuk file (Blob)
      const blob = await res.blob();

      // 3. Buat link download "gaib" dan paksa browser mengkliknya
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Backup_Arsip_Desa_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();

      // 4. Bersihkan memori
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      alert("❌ Gagal menghubungi backend untuk backup: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-hijau-pale/50 p-5 rounded-2xl border border-hijau/20">
          <div className="text-3xl font-black text-hijau-tua mb-1">{isLoading ? "..." : totalArsip}</div>
          <div className="text-xs font-semibold text-hijau/70 uppercase tracking-wide">Total Arsip</div>
        </div>
        <div className="bg-biru/10 p-5 rounded-2xl border border-biru/20">
          <div className="text-3xl font-black text-biru mb-1">{isLoading ? "..." : suratMasuk}</div>
          <div className="text-xs font-semibold text-biru/70 uppercase tracking-wide">Surat Masuk</div>
        </div>
        <div className="bg-emas/10 p-5 rounded-2xl border border-emas/20">
          <div className="text-3xl font-black text-emas mb-1">{isLoading ? "..." : suratKeluar}</div>
          <div className="text-xs font-semibold text-emas/70 uppercase tracking-wide">Surat Keluar</div>
        </div>
        <div className="bg-hijau-pale/50 p-5 rounded-2xl border border-hijau/20">
          <div className="text-3xl font-black text-hijau-tua mb-1">{isLoading ? "..." : adaFile}</div>
          <div className="text-xs font-semibold text-hijau/70 uppercase tracking-wide">Ada File</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="relative w-full lg:max-w-md">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-abu" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-latar border border-border rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:bg-white focus:border-hijau transition" placeholder="Cari No. Agenda, Nama, atau Perihal..." />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
            <button onClick={() => setFilterTipe("semua")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterTipe === "semua" ? "bg-hijau text-white" : "bg-latar border border-border text-abu hover:bg-abu-muda"}`}>Semua</button>
            <button onClick={() => setFilterTipe("masuk")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterTipe === "masuk" ? "bg-hijau text-white" : "bg-latar border border-border text-abu hover:bg-abu-muda"}`}>Surat Masuk</button>
            <button onClick={() => setFilterTipe("keluar")} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterTipe === "keluar" ? "bg-hijau text-white" : "bg-latar border border-border text-abu hover:bg-abu-muda"}`}>Surat Keluar</button>
          </div>

          <div className="flex items-center gap-4 border-t lg:border-t-0 border-border pt-4 lg:pt-0">
            <div className="text-xs text-abu font-medium shrink-0">{filteredData.length} dokumen</div>
            <button onClick={handleBackupExcel} className="bg-hijau-tua hover:bg-hijau text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-sm whitespace-nowrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Backup Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
            <thead className="bg-latar border-b border-border">
              <tr>
                {["No Agenda","Tipe","Jenis Surat","Nama / Asal","Perihal","NIK","No Surat","Tanggal","Status","Disposisi","Aksi"].map((h) => (
                  <th key={h} className="py-4 px-4 text-xs font-bold text-abu uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan="11" className="py-10 text-center text-sm text-abu">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin text-hijau" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Memuat arsip...
                  </div>
                </td></tr>
              ) : filteredData.length > 0 ? filteredData.map((item, i) => (
                <tr key={`${item.id}-${i}`} className="hover:bg-latar transition-colors">
                  <td className="py-4 px-4 font-bold text-hijau-tua whitespace-nowrap">{item.agenda}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.tipe === "masuk" ? "bg-biru/10 text-biru" : "bg-emas/10 text-[#7A5400]"}`}>
                      {item.tipe}
                    </span>
                  </td>
                  <td className="py-4 px-4">{item.jenis}</td>
                  <td className="py-4 px-4 font-medium">{item.asal}</td>
                  <td className="py-4 px-4">{item.perihal}</td>
                  <td className="py-4 px-4 text-abu">{item.nik}</td>
                  <td className="py-4 px-4 text-abu whitespace-nowrap">{item.no}</td>
                  <td className="py-4 px-4 font-semibold whitespace-nowrap">{item.tgl}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.status === "Selesai" ? "bg-hijau-pale text-hijau-tua" : "bg-emas-pale text-[#7A5400]"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">{item.disp}</td>
                  <td className="py-4 px-4 text-center">
                    <a href={`${BACKEND}${item.file_path}`} target="_blank" rel="noopener noreferrer" className={`text-sm font-bold ${item.file_path ? "text-biru hover:underline cursor-pointer" : "text-abu/40 cursor-not-allowed"} whitespace-nowrap`}>
                      {item.file_path ? "Unduh" : "Tidak ada"}
                    </a>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="11" className="py-10 text-center text-sm font-medium text-abu">
                  {searchTerm ? `Tidak ada dokumen yang cocok dengan "${searchTerm}".` : "Belum ada data arsip."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}