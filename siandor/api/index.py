from fastapi import FastAPI, BackgroundTasks, File, UploadFile, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import pandas as pd
import datetime
import os
import shutil
import gspread
from google.oauth2.service_account import Credentials
from sqlalchemy import create_engine, Column, Integer, String, desc, func
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from typing import Optional

# ─── PATH ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'credentials.json')
UPLOAD_DIR = "/tmp/uploads"
BACKUP_DIR = "/tmp/backup_lokal"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(BACKUP_DIR, exist_ok=True)

# ─── DATABASE ─────────────────────────────────────────────────────────────────
# Pakai /tmp agar bisa write di Vercel (filesystem read-only kecuali /tmp)
DB_PATH = "/tmp/siandor.db"
original_db = os.path.join(BASE_DIR, "..", "backend", "siandor.db")

# Copy DB dari backend ke /tmp jika belum ada (bawa data lama)
if os.path.exists(original_db) and not os.path.exists(DB_PATH):
    shutil.copy2(original_db, DB_PATH)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SuratDB(Base):
    __tablename__ = "surat"
    id            = Column(Integer, primary_key=True, index=True)
    no_agenda     = Column(String, index=True)
    jenis_surat   = Column(String)
    nama_pemohon  = Column(String)
    nik           = Column(String, nullable=True)
    perihal       = Column(String)
    no_surat_asli = Column(String, nullable=True)
    tanggal       = Column(String)
    status        = Column(String, default="Proses")
    disposisi     = Column(String, default="Kepala Desa")
    file_path     = Column(String, nullable=True)
    tipe          = Column(String, default="masuk")  # ← kolom baru


Base.metadata.create_all(bind=engine)

# Auto-migrasi kolom tipe jika DB lama belum punya
import sqlite3 as _sq
try:
    _c = _sq.connect(DB_PATH)
    cols = [r[1] for r in _c.execute("PRAGMA table_info(surat)").fetchall()]
    if "tipe" not in cols:
        _c.execute("ALTER TABLE surat ADD COLUMN tipe TEXT DEFAULT 'masuk'")
        _c.commit()
        print("✅ Migrasi: kolom tipe ditambahkan")
    _c.close()
except Exception as _e:
    print(f"⚠️ Migrasi: {_e}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── HELPER ──────────────────────────────────────────────────────────────────
def generate_no_agenda(db: Session) -> str:
    tahun = datetime.datetime.now().year
    count = db.query(func.count(SuratDB.id)).filter(
        SuratDB.no_agenda.like(f"%/{tahun}")
    ).scalar() or 0
    return f"AG-{str(count + 1).zfill(3)}/{tahun}"


def format_tanggal(t: str) -> str:
    try:
        return datetime.datetime.strptime(t, "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        return t


def surat_to_dict(s: SuratDB) -> dict:
    jenis = s.jenis_surat or ""
    if ". " in jenis:
        jenis = jenis.split(". ", 1)[1]
    parts = jenis.split()
    jenis_label = parts[1].capitalize() if len(parts) >= 2 and parts[0].upper() == "SURAT" else (parts[0].capitalize() if parts else jenis)

    status = s.status or "Proses"
    tipe = s.tipe or "masuk"
    badge = "bg-hijau-pale text-hijau-tua" if status == "Selesai" else "bg-emas-pale text-[#7A5400]"

    return {
        "id": s.id, "agenda": s.no_agenda, "no_agenda": s.no_agenda,
        "jenis": jenis_label, "jenis_surat": s.jenis_surat,
        "asal": s.nama_pemohon, "nama_pemohon": s.nama_pemohon,
        "perihal": s.perihal, "nik": s.nik or "-",
        "no": s.no_surat_asli or "-", "no_surat_asli": s.no_surat_asli or "-",
        "tgl": format_tanggal(s.tanggal), "tanggal": s.tanggal,
        "disp": s.disposisi, "disposisi": s.disposisi,
        "status": status, "b": badge,
        "file_path": s.file_path, "tipe": tipe,
    }


# ─── APP ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="SIANDOR API", version="2.0")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SPREADSHEET_ID = '1Xz9g8VYe0rzPNdNUhnfH-sOXfv5fPuKMUhOP98dP9ls'


# ═══ GET /api/surat ═══════════════════════════════════════════════════════════
@app.get("/api/surat")
def get_semua_surat(
    tipe: Optional[str] = None,
    jenis: Optional[str] = None,
    db: Session = Depends(get_db)
):
    filter_tipe = tipe or jenis
    query = db.query(SuratDB)
    if filter_tipe in ("masuk", "keluar"):
        query = query.filter(SuratDB.tipe == filter_tipe)
    return [surat_to_dict(r) for r in query.order_by(desc(SuratDB.id)).all()]


# ═══ GET /api/surat/{id} ══════════════════════════════════════════════════════
@app.get("/api/surat/{surat_id}")
def get_surat_by_id(surat_id: int, db: Session = Depends(get_db)):
    row = db.query(SuratDB).filter(SuratDB.id == surat_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Surat tidak ditemukan")
    return surat_to_dict(row)


# ═══ POST /api/surat ══════════════════════════════════════════════════════════
@app.post("/api/surat", status_code=201)
async def tambah_surat(
    background_tasks: BackgroundTasks,
    jenis_surat:   str = Form(...),
    nama_pemohon:  str = Form(...),
    perihal:       str = Form(...),
    tanggal:       str = Form(...),
    nik:           str = Form(""),
    no_surat_asli: str = Form(""),
    status:        str = Form("Proses"),
    disposisi:     str = Form("Kepala Desa"),
    tipe:          str = Form("masuk"),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    if not all([jenis_surat, nama_pemohon, perihal, tanggal]):
        raise HTTPException(status_code=400, detail="Field wajib tidak boleh kosong")
    if tipe not in ("masuk", "keluar"):
        tipe = "masuk"

    # Generate no_agenda otomatis
    no_agenda = generate_no_agenda(db)

    # Simpan file
    file_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Format file tidak didukung")
        ts = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        safe_name = f"{no_agenda.replace('/', '-')}_{ts}{ext}"
        save_path = os.path.join(UPLOAD_DIR, safe_name)
        with open(save_path, "wb") as buf:
            buf.write(await file.read())
        file_path = f"/uploads/{safe_name}"

    # Simpan ke DB
    db_surat = SuratDB(
        no_agenda=no_agenda, jenis_surat=jenis_surat, nama_pemohon=nama_pemohon,
        nik=nik, perihal=perihal, no_surat_asli=no_surat_asli, tanggal=tanggal,
        status=status, disposisi=disposisi, file_path=file_path, tipe=tipe,
    )
    db.add(db_surat)
    db.commit()
    db.refresh(db_surat)

    # Sinkron ke Google Sheets di background
    background_tasks.add_task(
        robot_kirim_ke_google_sheets,
        no_agenda, jenis_surat, nama_pemohon, perihal, nik, no_surat_asli, tanggal, disposisi, status
    )

    return JSONResponse(status_code=201, content=surat_to_dict(db_surat))


# ═══ DELETE /api/surat/{id} ═══════════════════════════════════════════════════
@app.delete("/api/surat/{surat_id}")
def hapus_surat(surat_id: int, db: Session = Depends(get_db)):
    row = db.query(SuratDB).filter(SuratDB.id == surat_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Surat tidak ditemukan")
    if row.file_path:
        abs_path = os.path.join(UPLOAD_DIR, row.file_path.replace("/uploads/", ""))
        if os.path.exists(abs_path):
            os.remove(abs_path)
    db.delete(row)
    db.commit()
    return {"status": "success", "pesan": f"Surat ID {surat_id} dihapus"}


# ═══ GET /api/statistik ═══════════════════════════════════════════════════════
@app.get("/api/statistik")
def get_statistik(db: Session = Depends(get_db)):
    semua = db.query(SuratDB).order_by(desc(SuratDB.id)).all()
    total = len(semua)
    total_masuk   = sum(1 for s in semua if (s.tipe or "masuk") == "masuk")
    total_keluar  = sum(1 for s in semua if (s.tipe or "masuk") == "keluar")
    total_proses  = sum(1 for s in semua if (s.status or "").lower() == "proses")
    total_selesai = sum(1 for s in semua if (s.status or "").lower() == "selesai")
    terbaru = [surat_to_dict(s) for s in semua[:5]]
    return {
        "total_surat": total, "total_masuk": total_masuk, "total_keluar": total_keluar,
        "total_proses": total_proses, "total_selesai": total_selesai, "terbaru": terbaru,
    }


# ═══ Google Sheets ════════════════════════════════════════════════════════════
def robot_kirim_ke_google_sheets(no_agenda, jenis_surat, nama_pemohon, perihal, nik, no_surat_asli, tanggal, disposisi, status):
    try:
        if not os.path.exists(CREDENTIALS_PATH):
            print("⚠️ credentials.json tidak ditemukan, skip Google Sheets.")
            return
        creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
        client_gspread = gspread.authorize(creds)
        sheet = client_gspread.open_by_key(SPREADSHEET_ID).sheet1
        sheet.append_row([no_agenda, jenis_surat, nama_pemohon, perihal, nik or "-", no_surat_asli or "-", tanggal, disposisi, status])
        print("✅ Sinkron ke Google Sheets berhasil.")
    except Exception as e:
        print(f"❌ Gagal sinkron Google Sheets: {e}")


@app.post("/api/surat/export/sheets")
def export_ke_sheets(tipe: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        if not os.path.exists(CREDENTIALS_PATH):
            raise HTTPException(status_code=500, detail="credentials.json tidak ditemukan di server.")
        semua = db.query(SuratDB).all()
        if tipe in ("masuk", "keluar"):
            semua = [s for s in semua if (s.tipe or "masuk") == tipe]
        creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
        client = gspread.authorize(creds)
        sheet = client.open_by_key(SPREADSHEET_ID).sheet1
        sheet.clear()
        sheet.append_row(["NO AGENDA","JENIS SURAT","NAMA / ASAL","PERIHAL","NIK","NO SURAT","TANGGAL","DISPOSISI","STATUS"])
        if semua:
            sheet.append_rows([[s.no_agenda, s.jenis_surat, s.nama_pemohon, s.perihal, s.nik or "-", s.no_surat_asli or "-", s.tanggal, s.disposisi, s.status] for s in semua])
        return {"status": "success", "pesan": f"Berhasil menulis {len(semua)} data ke Google Spreadsheet!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══ Export Excel ════════════════════════════════════════════════════════════
@app.get("/api/surat/export/excel")
def export_excel(tipe: Optional[str] = None, db: Session = Depends(get_db)):
    semua = db.query(SuratDB).all()
    if tipe in ("masuk", "keluar"):
        semua = [s for s in semua if (s.tipe or "masuk") == tipe]
    if not semua:
        return {"pesan": "Tidak ada data untuk diekspor."}
    data = [{"NO AGENDA": s.no_agenda, "TIPE": s.tipe or "masuk", "JENIS SURAT": s.jenis_surat,
             "NAMA / ASAL": s.nama_pemohon, "NIK": s.nik or "-", "PERIHAL": s.perihal,
             "NO SURAT": s.no_surat_asli or "-", "TANGGAL": format_tanggal(s.tanggal),
             "STATUS": s.status, "DISPOSISI": s.disposisi} for s in semua]
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    nama_tipe = f"_{tipe.upper()}" if tipe else ""
    nama_file = f"Backup_Arsip{nama_tipe}_{ts}.xlsx"
    path = os.path.join(BACKUP_DIR, nama_file)
    pd.DataFrame(data).to_excel(path, index=False)
    return FileResponse(path=path, filename=nama_file, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"pesan": "SIANDOR API v2.0 berjalan!"}

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    total = db.query(func.count(SuratDB.id)).scalar() or 0
    return {"status": "ok", "total_surat": total}