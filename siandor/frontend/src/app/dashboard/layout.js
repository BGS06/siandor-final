"use client";
import { useState, createContext, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export const ModalContext = createContext();

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [role, setRole] = useState("admin");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedRole = localStorage.getItem("siandor_active_user");
    if (savedRole) {
      setRole(savedRole);
    } else {
      router.push("/login");
    }
  }, [router]);

  const userProfiles = {
    kepala_desa: { nama: "Sumardi, S.Sos", jabatan: "Kepala Desa", inisial: "KD", color: "bg-emas" },
    sekretaris: { nama: "Endang Susanti", jabatan: "Sekretaris Desa", inisial: "SD", color: "bg-biru" },
    admin: { nama: "Admin Desa", jabatan: "Operator Administrasi", inisial: "AD", color: "bg-hijau-muda" },
  };
  const activeProfile = userProfiles[role] || userProfiles["admin"];

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    jenis_surat: "", nama_pemohon: "", nik: "", perihal: "",
    no_surat_asli: "", tanggal: "", status: "Proses", disposisi: "Kepala Desa",
  });

  // STATE BARU: Untuk menyimpan pilihan kategori halaman
  const [kategoriSurat, setKategoriSurat] = useState("Masuk");

  const [filePendukung, setFilePendukung] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [onNewSuratCallback, setOnNewSuratCallback] = useState(null);
  const registerNewSuratCallback = useCallback((fn) => {
    setOnNewSuratCallback(() => fn);
  }, []);

  useEffect(() => { setIsSidebarOpen(false); }, [pathname]);

  const [notifications, setNotifications] = useState([
    { id: 1, title: "Surat Masuk Baru", desc: "Surat Undangan dari Kecamatan Paron", time: "10 menit lalu", type: "masuk", link: "/dashboard/surat-masuk", read: false },
    { id: 2, title: "Perlu Verifikasi", desc: "Surat Pindah Penduduk a.n Sri Mulyani", time: "1 jam lalu", type: "warning", link: "/dashboard/surat-keluar", read: false },
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const handleMarkAllRead = () => setNotifications(notifications.map((n) => ({ ...n, read: true })));
  const handleNotifClick = (notif) => {
    setNotifications(notifications.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    setIsNotifOpen(false);
    router.push(notif.link);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFilePendukung(null);
    setIsDragging(false);
    setFormData({ jenis_surat: "", nama_pemohon: "", nik: "", perihal: "", no_surat_asli: "", tanggal: "", status: "Proses", disposisi: "Kepala Desa" });
    setKategoriSurat("Masuk"); // RESET CATEGORY
  };

  const handleSubmit = async () => {
    if (!formData.jenis_surat || !formData.nama_pemohon || !formData.perihal || !formData.tanggal) {
      alert("Mohon lengkapi field yang wajib diisi (*)");
      return;
    }
    setIsSubmitting(true);

    const dateCode = new Date().toISOString().slice(0,10).replace(/-/g,""); 
    const randomCode = Math.floor(1000 + Math.random() * 9000); 
    const generatedAgenda = `AGD-${dateCode}-${randomCode}`;
    
    const dataToSend = new FormData();
    dataToSend.append("no_agenda", generatedAgenda); 

    // LOGIKA TAG PINTAR DITERAPKAN DI SINI
    const finalJenisSurat = kategoriSurat === "Keluar" ? `[KELUAR] ${formData.jenis_surat}` : `[MASUK] ${formData.jenis_surat}`;
    dataToSend.append("jenis_surat", finalJenisSurat);
    
    dataToSend.append("nama_pemohon", formData.nama_pemohon);
    dataToSend.append("nik", formData.nik);
    dataToSend.append("perihal", formData.perihal);
    dataToSend.append("no_surat_asli", formData.no_surat_asli);
    dataToSend.append("tanggal", formData.tanggal);
    dataToSend.append("status", formData.status);
    dataToSend.append("disposisi", formData.disposisi);
    
    if (filePendukung) dataToSend.append("file", filePendukung);

    try {
      const response = await fetch("https://3cfe-140-213-187-76.ngrok-free.app/api/surat", {
        method: "POST",
        body: dataToSend,
      });

      if (response.ok) {
        if (onNewSuratCallback) onNewSuratCallback();
        closeModal();
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Gagal menyimpan data ke database. Pesan server: " + JSON.stringify(err));
      }
    } catch (error) {
      alert("Error jaringan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) setFilePendukung(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e) => {
    if (e.target.files?.[0]) setFilePendukung(e.target.files[0]);
  };

  let pageTitle = "Dashboard";
  if (pathname === "/dashboard/kades") pageTitle = "Dashboard Kepala Desa";
  if (pathname === "/dashboard/sekdes") pageTitle = "Dashboard Sekretaris Desa";
  if (pathname === "/dashboard/surat-masuk") pageTitle = "Surat Masuk";
  if (pathname === "/dashboard/surat-keluar") pageTitle = "Surat Keluar";
  if (pathname === "/dashboard/penyimpanan-arsip") pageTitle = "Penyimpanan Arsip";
  if (pathname === "/dashboard/laporan") pageTitle = "Laporan";
  if (pathname === "/dashboard/pengguna") pageTitle = "Pengguna";

  const showTambahSurat = pathname === "/dashboard/surat-masuk" || pathname === "/dashboard/surat-keluar";

  if (!isClient) return null;

  return (
    <ModalContext.Provider value={{ openModal, registerNewSuratCallback }}>
      <div className="flex min-h-screen bg-latar overflow-x-hidden">

        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* SIDEBAR */}
        <aside className={`w-[260px] min-h-screen bg-hijau-tua flex flex-col fixed top-0 left-0 z-50 overflow-y-auto transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 shadow-2xl lg:shadow-none`}>
          <div className="pt-7 pb-6 px-6 border-b border-white/5 shrink-0 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/logo-kabupaten.png" alt="Logo" className="w-11 h-11 object-contain rounded-md shadow-md shrink-0" />
              <div>
                <div className="font-display text-2xl font-black text-white leading-none tracking-tight">SIANDOR</div>
                <div className="text-xxs text-white/70 tracking-widest uppercase mt-1 leading-tight">Arsip Desa Ngrandulor</div>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <nav className="flex-1 py-4 flex flex-col gap-1">
            <div className="px-6 pt-2 pb-1 text-xs text-white/40 tracking-widest uppercase font-bold">Menu Utama</div>
            <Link href={role === "kepala_desa" ? "/dashboard/kades" : role === "sekretaris" ? "/dashboard/sekdes" : "/dashboard"} className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl text-sm transition-all ${(pathname === "/dashboard" || pathname === "/dashboard/kades" || pathname === "/dashboard/sekdes") ? "bg-white/10 text-hijau-terang font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              Beranda
            </Link>

            <div className="px-6 pt-5 pb-1 text-xs text-white/40 tracking-widest uppercase font-bold">Surat</div>
            <Link href="/dashboard/surat-masuk" className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl text-sm transition-all ${pathname === "/dashboard/surat-masuk" ? "bg-white/10 text-hijau-terang font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
              Surat Masuk
            </Link>
            <Link href="/dashboard/surat-keluar" className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl text-sm transition-all ${pathname === "/dashboard/surat-keluar" ? "bg-white/10 text-hijau-terang font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              Surat Keluar
            </Link>

            <div className="px-6 pt-5 pb-1 text-xs text-white/40 tracking-widest uppercase font-bold">Dokumen</div>
            <Link href="/dashboard/penyimpanan-arsip" className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl text-sm transition-all ${pathname === "/dashboard/penyimpanan-arsip" ? "bg-white/10 text-hijau-terang font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
              Penyimpanan Arsip
            </Link>
            <Link href="/dashboard/laporan" className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl text-sm transition-all ${pathname === "/dashboard/laporan" ? "bg-white/10 text-hijau-terang font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              Laporan
            </Link>

            <div className="px-6 pt-5 pb-1 text-xs text-white/40 tracking-widest uppercase font-bold">Pengaturan</div>
            {role === "admin" && (
              <Link href="/dashboard/pengguna" className={`flex items-center gap-3 px-4 py-3 mx-4 rounded-xl text-sm transition-all ${pathname === "/dashboard/pengguna" ? "bg-white/10 text-hijau-terang font-semibold" : "text-white/70 hover:bg-white/5 hover:text-white font-medium"}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Pengguna
              </Link>
            )}

            <button onClick={() => { localStorage.removeItem("siandor_active_user"); router.push("/login"); }} className="flex items-center gap-3 px-4 py-2 mx-4 rounded-xl text-white/70 hover:bg-merah/20 hover:text-merah text-sm font-medium cursor-pointer transition-all mt-2 w-full text-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Keluar
            </button>
          </nav>

          <div className="mt-auto p-5 border-t border-white/5 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer">
              <div className={`w-10 h-10 rounded-full ${activeProfile.color} flex items-center justify-center font-bold text-sm text-white shrink-0`}>{activeProfile.inisial}</div>
              <div className="overflow-hidden">
                <div className="text-sm font-bold text-white leading-tight truncate">{activeProfile.nama}</div>
                <div className="text-xs text-white/50 truncate mt-0.5">{activeProfile.jabatan}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="lg:ml-[260px] flex-1 flex flex-col min-w-0 w-full">
          <header className="bg-white border-b border-border px-4 lg:px-8 h-[72px] flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-10 h-10 rounded-xl border border-border flex items-center justify-center text-hitam hover:bg-latar transition cursor-pointer">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <div className="text-lg font-bold text-hitam">{pageTitle}</div>
            </div>

            <div className="flex items-center gap-2 lg:gap-4">
              <div className="relative">
                <div onClick={() => setIsNotifOpen(!isNotifOpen)} className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition relative ${isNotifOpen ? "bg-abu-muda border-hijau text-hijau" : "bg-white border-border text-abu hover:bg-abu-muda"}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  {unreadCount > 0 && <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-merah rounded-full border-[1.5px] border-white animate-pulse" />}
                </div>
                {isNotifOpen && <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-[300px] sm:w-[360px] bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-latar/50">
                      <div className="font-bold text-hitam text-sm">Notifikasi</div>
                      {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-xs text-hijau font-semibold hover:underline cursor-pointer">Tandai sudah dibaca</button>}
                    </div>
                    <div className="max-h-[340px] overflow-y-auto">
                      {notifications.map((notif) => (
                        <div key={notif.id} onClick={() => handleNotifClick(notif)} className={`px-5 py-3.5 border-b border-latar flex gap-3 hover:bg-latar transition cursor-pointer ${notif.read ? "opacity-70" : "bg-white"}`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${notif.type === "masuk" ? "bg-emas-pale text-emas" : "bg-[#FDECEA] text-merah"}`}>
                            {notif.type === "masuk"
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            }
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <div className={`text-sm ${notif.read ? "font-medium" : "font-bold"} text-hitam`}>{notif.title}</div>
                              {!notif.read && <div className="w-2 h-2 bg-hijau rounded-full mt-1.5 shrink-0" />}
                            </div>
                            <div className="text-xs text-abu leading-tight mb-1.5">{notif.desc}</div>
                            <div className="text-[10px] text-abu font-medium">{notif.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {role === "admin" && showTambahSurat && (
                <button onClick={openModal} className="bg-hijau hover:bg-hijau-tua text-white px-3 lg:px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span className="hidden sm:inline">Tambah Surat</span>
                </button>
              )}
            </div>
          </header>

          <main className="p-4 lg:p-8 flex-1">{children}</main>
        </div>

        {/* MODAL TAMBAH SURAT */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">

              <div className="p-5 lg:p-6 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-hitam">Tambah Surat Baru</h2>
                  <p className="text-sm text-abu mt-0.5">
                    {pathname.includes("keluar") ? "Surat Keluar" : "Surat Masuk"} — isi form untuk menambahkan ke arsip.
                  </p>
                </div>
                <button onClick={closeModal} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-abu-muda cursor-pointer transition text-abu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="p-5 lg:p-6 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">No Agenda (Otomatis)</label>
                    <input type="text" value="(akan digenerate)" disabled className="w-full p-3 border-border border rounded-xl text-sm bg-latar text-abu font-bold cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">Jenis Surat <span className="text-merah">*</span></label>
                    <select value={formData.jenis_surat} onChange={(e) => setFormData({ ...formData, jenis_surat: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white cursor-pointer transition">
                      <option value="">-- Pilih Jenis --</option>
                      <option value="SURAT KETERANGAN KELAHIRAN">1. SURAT KETERANGAN KELAHIRAN</option>
                      <option value="SURAT KETERANGAN KEMATIAN">2. SURAT KETERANGAN KEMATIAN</option>
                      <option value="SURAT KETERANGAN USAHA">3. SURAT KETERANGAN USAHA</option>
                      <option value="SURAT KETERANGAN DOMISILI">4. SURAT KETERANGAN DOMISILI</option>
                      <option value="SURAT KETERANGAN BELUM PERNAH NIKAH">5. SURAT KETERANGAN BELUM PERNAH NIKAH</option>
                      <option value="SURAT KETERANGAN SUDAH MENIKAH">6. SURAT KETERANGAN SUDAH MENIKAH</option>
                      <option value="SURAT KETERANGAN KEPEMILIKAN KENDARAAN">7. SURAT KETERANGAN KEPEMILIKAN KENDARAAN</option>
                      <option value="SURAT KETERANGAN CATATAN KEPOLISIAN">8. SURAT KETERANGAN CATATAN KEPOLISIAN</option>
                      <option value="SURAT KETERANGAN PENDUDUK">9. SURAT KETERANGAN PENDUDUK</option>
                      <option value="SURAT KETERANGAN PENGANTAR BBM">10. SURAT KETERANGAN PENGANTAR BBM</option>
                      <option value="SURAT KETERANGAN PENGHASILAN">11. SURAT KETERANGAN PENGHASILAN</option>
                      <option value="SURAT KETERANGAN TIDAK MAMPU">12. SURAT KETERANGAN TIDAK MAMPU</option>
                      <option value="SURAT KETERANGAN KEHILANGAN">13. SURAT KETERANGAN KEHILANGAN</option>
                      <option value="SURAT KETERANGAN UMUM / YANMA">14. SURAT KETERANGAN UMUM / YANMA</option>
                      <option value="SURAT KETERANGAN BEPERGIAN">15. SURAT KETERANGAN BEPERGIAN</option>
                      <option value="SURAT PERNYATAAN DAN KUASA">16. SURAT PERNYATAAN DAN KUASA</option>
                      <option value="SURAT DINAS KELUAR">17. SURAT DINAS KELUAR</option>
                      <option value="SURAT DINAS DATANG">18. SURAT DINAS DATANG</option>
                      <option value="YAMKESMASKIN">19. YAMKESMASKIN</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">Nama Pemohon / Asal <span className="text-merah">*</span></label>
                    <input type="text" value={formData.nama_pemohon} onChange={(e) => setFormData({ ...formData, nama_pemohon: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white transition" placeholder="Contoh: Budi / Kecamatan Paron" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">NIK</label>
                    <input type="text" value={formData.nik} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white transition" placeholder="16 digit NIK (Bila ada)" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-hitam mb-1.5 block">Perihal <span className="text-merah">*</span></label>
                  <input type="text" value={formData.perihal} onChange={(e) => setFormData({ ...formData, perihal: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white transition" placeholder="Isi ringkas tujuan surat" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">Nomor Surat Asli</label>
                    <input type="text" value={formData.no_surat_asli} onChange={(e) => setFormData({ ...formData, no_surat_asli: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white transition" placeholder="Sesuai dokumen fisik" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">Tanggal Terima / Kirim <span className="text-merah">*</span></label>
                    <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white transition" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-hitam mb-1.5 block">Upload Dokumen Pendukung</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("file-upload").click()}
                    className={`border border-dashed rounded-xl p-8 text-center transition cursor-pointer group ${isDragging ? "border-hijau bg-hijau-pale" : "border-border hover:bg-hijau-pale hover:border-hijau-muda"}`}
                  >
                    <input type="file" id="file-upload" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                    <svg className={`mx-auto mb-3 transition ${isDragging ? "text-hijau" : "text-abu group-hover:text-hijau"}`} width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <p className="text-sm text-abu">Drag & drop file di sini, atau <span className="text-hijau font-bold">klik untuk pilih file</span></p>
                    <p className="text-xs text-abu/70 mt-1.5 font-medium">PDF, JPG, PNG – Maks. 5MB</p>
                    {filePendukung && (
                      <div className="mt-4 px-4 py-2 bg-hijau-pale text-hijau border border-hijau-muda rounded-lg text-sm font-bold truncate">
                        ✅ {filePendukung.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">Status Surat</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white cursor-pointer transition">
                      <option value="Proses">Proses</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-hitam mb-1.5 block">Disposisi</label>
                    <select value={formData.disposisi} onChange={(e) => setFormData({ ...formData, disposisi: e.target.value })} className="w-full p-3 border-border border rounded-xl text-sm outline-none focus:border-hijau bg-white cursor-pointer transition">
                      <option value="Kepala Desa">Kepala Desa</option>
                      <option value="Sekretaris Desa">Sekretaris Desa</option>
                      <option value="Kaur Umum">Kaur Umum</option>
                      <option value="Belum Didisposisi">Belum Didisposisi</option>
                    </select>
                  </div>
                </div>

                {/* UI DROPDOWN BARU DITAMBAHKAN DI SINI */}
                <div className="mt-4 pt-4 border-t border-border">
                  <label className="text-sm font-semibold text-hitam mb-1.5 block">Simpan Ke Halaman <span className="text-merah">*</span></label>
                  <select 
                    value={kategoriSurat} 
                    onChange={(e) => setKategoriSurat(e.target.value)} 
                    className="w-full p-3 border-border border rounded-xl text-sm font-bold text-hijau-tua outline-none focus:border-hijau focus:ring-2 focus:ring-hijau/20 bg-latar cursor-pointer transition"
                  >
                    <option value="Masuk">📥 Simpan sebagai Surat Masuk</option>
                    <option value="Keluar">📤 Simpan sebagai Surat Keluar</option>
                  </select>
                  <p className="text-xs text-abu mt-1.5">Pilih di halaman mana surat ini akan ditampilkan.</p>
                </div>

              </div>

              <div className="p-5 lg:p-6 border-t border-border flex justify-end gap-3 shrink-0">
                <button onClick={closeModal} disabled={isSubmitting} className="px-5 py-2.5 border-2 border-hijau text-hijau rounded-xl font-bold text-sm hover:bg-hijau-pale transition cursor-pointer disabled:opacity-50">
                  Batal
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2.5 bg-hijau text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hijau-tua shadow-md transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                  {isSubmitting
                    ? <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Menyimpan...</>
                    : "Simpan Surat"
                  }
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </ModalContext.Provider>
  );
}