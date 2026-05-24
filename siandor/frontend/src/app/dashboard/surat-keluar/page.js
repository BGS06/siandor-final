"use client";
import { useState, useEffect, useContext } from "react";
import { ModalContext } from "../layout";

const BACKEND = "https://3cfe-140-213-187-76.ngrok-free.app";

export default function SuratKeluarPage() {
  const [suratData, setSuratData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSurat, setSelectedSurat] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { registerNewSuratCallback } = useContext(ModalContext);

  useEffect(() => {
    if (registerNewSuratCallback) {
      registerNewSuratCallback(() => {
        fetchSurat();
      });
      return () => registerNewSuratCallback(null);
    }
  }, [registerNewSuratCallback]);

  useEffect(() => {
    fetchSurat();
  }, []);

  const fetchSurat = async () => {
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
      
      const formattedData = data.map(item => {
        const jenisLower = item.jenis_surat.toLowerCase();
        // LOGIKA BARU: Jika ada kata "keluar", "keterangan", "pengantar", "rekomendasi", dll, maka masuk Surat Keluar
        const kataKunciKeluar = ["keluar", "keterangan", "pengantar", "rekomendasi", "keputusan", "pemberitahuan", "undangan"];
        const isKeluar = kataKunciKeluar.some(kata => jenisLower.includes(kata));

        return {
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
          tipe: isKeluar ? "keluar" : "masuk"
        };
      });

      // Filter hanya tampilkan yang tipe-nya "keluar"
      setSuratData(formattedData.filter(s => s.tipe === "keluar"));
    } catch {
      setSuratData([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = suratData.filter((row) =>
    [row.agenda, row.asal, row.perihal, row.jenis].join(" ").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderPreview = (surat) => {
    if (!surat.file_path) {
      return (
        <div className="w-full h-[200px] bg-latar rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-abu">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 text-border"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p className="font-bold text-hitam text-sm">Tidak Ada File</p>
          <p className="text-xs mt-1 text-abu">Dokumen tidak diupload saat input</p>
        </div>
      );
    }

    const url = `${BACKEND}${surat.file_path}`;
    const ext = surat.file_path.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      return (
        <div className="w-full rounded-xl overflow-hidden border border-border bg-latar">
          <img src={url} alt="Dokumen" className="w-full max-h-[280px] object-contain" />
        </div>
      );
    }

    if (ext === "pdf") {
      return (
        <div className="w-full h-[280px] rounded-xl overflow-hidden border border-border">
          <iframe src={url} className="w-full h-full" title="Preview PDF" />
        </div>
      );
    }

    return (
      <div className="w-full h-[120px] bg-latar rounded-xl border border-border flex flex-col items-center justify-center gap-2">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-abu"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p className="text-xs text-abu font-medium">{surat.file_path.split("/").pop()}</p>
      </div>
    );
  };

  const handleUnduh = (surat) => {
    if (!surat.file_path) { alert("Tidak ada file untuk diunduh."); return; }
    const url = `${BACKEND}${surat.file_path}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", surat.file_path.split("/").pop());
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-abu" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-latar border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:bg-white focus:border-hijau transition" placeholder="Cari No. Agenda, Nama, atau Perihal..." />
          </div>
          <div className="text-xs text-abu font-medium shrink-0">{filteredData.length} surat</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[1100px]">
            <thead className="bg-latar border-b border-border">
              <tr>
                {["No Agenda","Jenis","Nama / Asal Surat","Perihal","NIK","No Surat","Tanggal Kirim","Disposisi","Status","Aksi"].map((h) => (
                  <th key={h} className="py-4 px-4 text-xs font-bold text-abu uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan="10" className="py-10 text-center text-sm text-abu">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin text-hijau" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Memuat data...
                  </div>
                </td></tr>
              ) : filteredData.length > 0 ? filteredData.map((item, i) => (
                <tr key={`${item.id}-${i}`} className="hover:bg-latar transition-colors">
                  <td className="py-4 px-4 font-bold text-hijau-tua whitespace-nowrap">{item.agenda}</td>
                  <td className="py-4 px-4">{item.jenis}</td>
                  <td className="py-4 px-4 font-medium">{item.asal}</td>
                  <td className="py-4 px-4">{item.perihal}</td>
                  <td className="py-4 px-4 text-abu">{item.nik}</td>
                  <td className="py-4 px-4 text-abu whitespace-nowrap">{item.no}</td>
                  <td className="py-4 px-4 font-semibold whitespace-nowrap">{item.tgl}</td>
                  <td className="py-4 px-4">{item.disp}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.status === "Selesai" ? "bg-hijau-pale text-hijau-tua" : "bg-emas-pale text-[#7A5400]"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button onClick={() => setSelectedSurat(item)} className="text-biru text-sm font-bold hover:underline cursor-pointer">Lihat</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="10" className="py-10 text-center text-sm font-medium text-abu">
                  {searchTerm ? `Tidak ada surat yang cocok dengan "${searchTerm}".` : "Belum ada data surat keluar."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSurat && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-border flex justify-between items-center bg-latar rounded-t-2xl shrink-0">
              <div>
                <h2 className="text-lg font-bold text-hitam">Detail Dokumen</h2>
                <p className="text-sm font-bold text-hijau-tua mt-0.5">{selectedSurat.agenda}</p>
              </div>
              <button onClick={() => setSelectedSurat(null)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-white bg-latar cursor-pointer transition text-abu">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {renderPreview(selectedSurat)}
              <div className="bg-latar border border-border rounded-xl p-4 space-y-2.5 text-sm">
                {[
                  ["Tujuan Surat", selectedSurat.asal],
                  ["Perihal", selectedSurat.perihal],
                  ["No. Surat", selectedSurat.no],
                  ["Tanggal", selectedSurat.tgl],
                  ["Disposisi", selectedSurat.disp],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-abu font-medium shrink-0">{label}:</span>
                    <span className="font-bold text-hitam text-right">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center gap-4">
                  <span className="text-abu font-medium shrink-0">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedSurat.status === "Selesai" ? "bg-hijau-pale text-hijau-tua" : "bg-emas-pale text-[#7A5400]"}`}>
                    {selectedSurat.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex justify-end gap-3 bg-latar rounded-b-2xl shrink-0">
              <button onClick={() => setSelectedSurat(null)} className="px-4 py-2 border-2 border-border text-hitam rounded-lg font-bold text-xs hover:bg-white transition cursor-pointer">Tutup</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-border text-hitam rounded-lg font-bold text-xs hover:bg-latar shadow-sm transition cursor-pointer">Cetak</button>
              <button onClick={() => handleUnduh(selectedSurat)} disabled={!selectedSurat.file_path} className="px-4 py-2 bg-hijau text-white rounded-lg font-bold text-xs hover:bg-hijau-tua shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">Unduh PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}