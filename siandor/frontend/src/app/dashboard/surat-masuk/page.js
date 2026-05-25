"use client";
import { useState, useEffect, useContext } from "react";
import { ModalContext } from "../layout";

const BACKEND = "https://0c9f-140-213-187-76.ngrok-free.app";

export default function SuratMasukPage() {
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
        headers: { "ngrok-skip-browser-warning": "69420" }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      const formattedData = data.map(item => {
        const rawJenis = item.jenis_surat || "";
        const jenisLower = rawJenis.toLowerCase();
        
        let tipe = "masuk";
        if (jenisLower.includes("[keluar]")) {
          tipe = "keluar";
        } else if (jenisLower.includes("[masuk]")) {
          tipe = "masuk";
        } else {
          const kataKunciKeluar = ["keluar", "keterangan", "pengantar", "rekomendasi"];
          tipe = kataKunciKeluar.some(kata => jenisLower.includes(kata)) ? "keluar" : "masuk";
        }

        const cleanJenis = rawJenis.replace(/\[KELUAR\]\s?/gi, "").replace(/\[MASUK\]\s?/gi, "");

        return {
          id: item.id,
          agenda: item.no_agenda,
          jenis: cleanJenis,
          asal: item.nama_pemohon,
          perihal: item.perihal,
          nik: item.nik || "-",
          no: item.no_surat_asli || "-",
          tgl: item.tanggal,
          disp: item.disposisi,
          status: item.status,
          file_path: item.file_path,
          tipe: tipe
        };
      });

      // FILTER HANYA SURAT MASUK
      setSuratData(formattedData.filter(s => s.tipe === "masuk"));
    } catch {
      setSuratData([]); 
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = suratData.filter((row) =>
    [row.agenda, row.asal, row.perihal, row.jenis].join(" ").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Bagian renderPreview dan return sama seperti Surat Keluar
  const renderPreview = (surat) => {
    if (!surat.file_path) {
      return (
        <div className="w-full h-[200px] bg-latar rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-abu">
          <p className="font-bold text-hitam text-sm">Tidak Ada File</p>
        </div>
      );
    }
    const url = `${BACKEND}${surat.file_path}`;
    const ext = surat.file_path.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
      return <div className="w-full rounded-xl overflow-hidden border border-border bg-latar"><img src={url} alt="Dokumen" className="w-full max-h-[280px] object-contain" /></div>;
    }
    if (ext === "pdf") {
      return <div className="w-full h-[280px] rounded-xl overflow-hidden border border-border"><iframe src={url} className="w-full h-full" title="Preview PDF" /></div>;
    }
    return <div className="w-full h-[120px] bg-latar flex items-center justify-center"><p className="text-xs font-medium">{surat.file_path.split("/").pop()}</p></div>;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-latar border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="Cari No. Agenda, Nama..." />
          </div>
          <div className="text-xs font-medium shrink-0">{filteredData.length} surat</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[1100px]">
            <thead className="bg-latar border-b border-border">
              <tr>
                {["No Agenda","Jenis","Asal Surat","Perihal","NIK","No Surat","Tanggal Terima","Disposisi","Status","Aksi"].map((h) => (
                  <th key={h} className="py-4 px-4 text-xs font-bold text-abu uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan="10" className="py-10 text-center text-sm text-abu">Memuat data...</td></tr>
              ) : filteredData.length > 0 ? filteredData.map((item, i) => (
                <tr key={`${item.id}-${i}`} className="hover:bg-latar">
                  <td className="py-4 px-4 font-bold text-hijau-tua">{item.agenda}</td>
                  <td className="py-4 px-4">{item.jenis}</td>
                  <td className="py-4 px-4 font-medium">{item.asal}</td>
                  <td className="py-4 px-4">{item.perihal}</td>
                  <td className="py-4 px-4 text-abu">{item.nik}</td>
                  <td className="py-4 px-4 text-abu">{item.no}</td>
                  <td className="py-4 px-4 font-semibold">{item.tgl}</td>
                  <td className="py-4 px-4">{item.disp}</td>
                  <td className="py-4 px-4"><span className="px-3 py-1 rounded-full text-xs font-bold bg-hijau-pale text-hijau-tua">{item.status}</span></td>
                  <td className="py-4 px-4 text-center"><button onClick={() => setSelectedSurat(item)} className="text-biru text-sm font-bold">Lihat</button></td>
                </tr>
              )) : (
                <tr><td colSpan="10" className="py-10 text-center text-sm font-medium text-abu">Belum ada data surat masuk.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSurat && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex justify-between items-center bg-latar">
              <div><h2 className="text-lg font-bold">Detail Dokumen</h2></div>
              <button onClick={() => setSelectedSurat(null)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center">X</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">{renderPreview(selectedSurat)}</div>
            <div className="px-5 py-4 border-t border-border flex justify-end gap-3 bg-latar">
              <button onClick={() => setSelectedSurat(null)} className="px-4 py-2 border-2 border-border text-hitam rounded-lg font-bold text-xs">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}