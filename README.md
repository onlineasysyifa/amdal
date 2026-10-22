# Sistem Informasi Pengelolaan IPAL dan Limbah B3 Klinik Asy-Syifa

Aplikasi web modern berbasis arsitektur *JAMstack* dan *Serverless* untuk pemantauan, pencatatan operasional, dan pelaporan Instalasi Pengolahan Air Limbah (IPAL) serta Limbah Bahan Berbahaya dan Beracun (B3) pada Fasilitas Pelayanan Kesehatan **Klinik Pratama Asy-Syifa**.

Aplikasi ini dihosting sebagai static web app pada **GitHub Pages** dan terintegrasi langsung dengan **Supabase** (PostgreSQL Database, Supabase Auth, Row Level Security, dan Supabase Storage) tanpa memerlukan hosting backend atau database MySQL terpisah.

---

## 1. Fitur Utama

### A. Modul IPAL (Instalasi Pengolahan Air Limbah)
- **Pencatatan Debit Air**:
  - Pencatatan meteran harian (metode flowmeter kumulatif, digital, v-notch, manual).
  - Penghitungan otomatis selisih volume ($m^3$) dengan validasi angka meter tidak wajar.
  - Verifikasi data debit.
- **Pemeriksaan Inlet & Outlet**:
  - Form pemeriksaan sampel air baku (*inlet*) dan air olahan (*outlet*).
  - Evaluasi otomatis parameter uji terhadap **Baku Mutu PermenLHK No. P.68 Tahun 2016** (pH, Suhu, BOD, COD, TSS, Minyak & Lemak, Amoniak, Total Coliform).
  - Pengunggahan dan pengelolaan berkas Laporan Hasil Uji (LHU) laboratorium terakreditasi.
- **Pemantauan & Pemeliharaan**:
  - Grafik tren debit dan efisiensi pengolahan air limbah.
  - Buku log pemeliharaan unit (*blower*, pompa submersible, bak sedimentasi, filter).

### B. Modul Limbah B3 Medis Fasyankes
- **Pengumpulan dari Ruangan**:
  - Transaksi otomatis bernomor unik (`TRX-...`).
  - Dukungan multi-jenis limbah dalam satu transaksi pengumpulan.
  - Pencatatan petugas penyerah dan pengambil, kondisi kemasan, serta kesesuaian label/simbol *biohazard*.
- **Penerimaan Fisik di TPS**:
  - Verifikasi dan penimbangan fisik di TPS sebelum limbah diakui sebagai stok.
  - Validasi jumlah diterima terhadap jumlah yang diambil dari ruangan (mendukung penerimaan sebagian/parsial).
- **Saldo Stok TPS & Kartu Mutasi**:
  - Formula saldo tervalidasi: $\text{Saldo Akhir} = \text{Stok Awal} + \text{Penerimaan Sah} - \text{Pengangkutan Sah} \pm \text{Penyesuaian Resmi}$.
  - Pemisahan satuan secara ketat: `kg`, `liter`, `unit/buah`, dan `safety box`.
  - Sistem peringatan dini masa simpan limbah B3 sesuai **PP No. 22/2021 & PermenLHK No. P.56/2015**:
    - **Aman**: $\le 76$ hari
    - **Mendekati Batas**: $77 - 90$ hari
    - **Melebihi Batas**: $> 90$ hari
  - Kartu stok kronologis (buku besar mutasi masuk-keluar TPS).
- **Pengangkutan Keluar (Pihak Ke-3)**:
  - Pencatatan serah terima limbah ke transporter dan pengolah resmi berizin KLHK.
  - Validasi ketersediaan stok fisik di TPS sebelum konfirmasi (mencegah stok minus).
  - Pelacakan nomor manifest, plat nomor kendaraan, pengemudi, bukti timbang, dan status kelengkapan dokumen (BAST & Sertifikat Pemusnahan).

### C. Inspeksi TPS & Tindak Lanjut Korektif
- Checklist sarana TPS (ventilasi, kebersihan, spillage kit, APAR, label, suhu ruangan).
- Pelacakan temuan masalah operasional dan rencana tindakan korektif (*open*, *in progress*, *resolved*).

### D. Laporan Resmi & Ekspor
- Laporan Debit Air IPAL, Laporan Timbulan Ruangan, Neraca Mutasi TPS, dan Laporan Pengangkutan.
- **Format Cetak Formal A4**: Dilengkapi Kop Surat Resmi Klinik Pratama Asy-Syifa, tabel rapi, serta kolom tanda tangan Sanitarian & Penanggung Jawab Klinik.
- **Ekspor CSV**: Format UTF-8 dengan BOM, langsung rapi dan kompatibel dibuka di Microsoft Excel.

### E. Keamanan, Backup & Audit Trail
- Row Level Security (RLS) di seluruh tabel: Pengguna anonim diblokir secara ketat dari seluruh data operasional.
- Penyimpanan dokumen pada bucket privat Supabase Storage.
- Fitur Ekspor Cadangan Lengkap (JSON Backup) dan Pemulihan (Restore).
- Pencatatan Audit Log otomatis untuk setiap operasi sistem (*LOGIN, LOGOUT, INSERT, UPDATE, DELETE*).

---

## 2. Struktur Repositori

```
├── .github/
│   └── workflows/
│       └── deploy.yml             # Workflow GitHub Actions untuk GitHub Pages
├── index.html                     # Entry point Single Page Application
├── 404.html                       # Fallback routing GitHub Pages
├── assets/
│   ├── css/
│   │   ├── style.css              # Tema & styling responsive Bootstrap 5
│   │   └── print.css              # Format cetak A4 kop resmi & tanda tangan
│   ├── js/
│   │   ├── config.js              # Konfigurasi Supabase URL & Anon Key
│   │   ├── app.js                 # Router, state controller & inisialisasi
│   │   ├── auth.js                # Autentikasi Supabase & session guard
│   │   ├── supabaseClient.js      # Client wrapper, RLS & fallback storage
│   │   ├── modules/
│   │   │   ├── dashboard.js       # Metrik KPI, filter & Chart.js charts
│   │   │   ├── ipal.js            # Flow meter, sampling inlet/outlet, maintenance
│   │   │   ├── waste.js           # Pengumpulan, TPS receive, stok mutasi, transport
│   │   │   ├── masters.js         # Master Ruangan, Jenis Limbah, Transporter
│   │   │   ├── inspections.js     # Inspeksi sarana TPS & Tindak lanjut korektif
│   │   │   ├── reports.js         # Laporan terpadu, cetak A4 & CSV export
│   │   │   ├── settings.js        # Konfigurasi klinik & parameter baku mutu
│   │   │   └── backup.js          # Backup JSON, restore & audit logs
│   │   └── utils/
│   │       ├── formatters.js      # Tanggal Indonesia, satuan, badge status
│   │       ├── export.js          # Generator CSV & Print Engine
│   │       └── notify.js          # Toast & modal konfirmasi
│   └── img/
│       └── logo.svg               # Logo Klinik Pratama Asy-Syifa
├── supabase/
│   ├── all_in_one_setup.sql       # Skrip komprehensif 1-klik untuk Supabase SQL Editor
│   ├── migrations/
│   │   ├── 01_initial_schema.sql  # Skema 21 tabel dan triggers
│   │   ├── 02_rls_policies.sql    # Kebijakan Row Level Security (RLS)
│   │   ├── 03_stock_functions.sql # View stok & fungsi atomik transaksi
│   │   ├── 04_storage_setup.sql   # Setup bucket privat storage & policy
│   │   └── 05_seed_data.sql       # Master ruangan, limbah B3, parameter baku mutu
│   └── README.md                  # Panduan eksekusi SQL di Supabase
└── README.md
```

---

## 3. Panduan Setup & Instalasi Langkah-demi-Langkah

### Langkah 1: Setup Database di Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard) dan buat sebuah project baru.
2. Buka menu **SQL Editor** pada project Supabase Anda.
3. Buka file `supabase/all_in_one_setup.sql` dari repository ini, salin seluruh isinya, lalu tempelkan ke SQL Editor.
4. Klik **Run** (eksekusi). Skrip ini akan membuat:
   - 21 tabel relasional dengan tipe data UUID, validasi, dan relasi integritas referensial.
   - Trigger otomatis pembaharuan kolom `updated_at`.
   - Kebijakan Row Level Security (RLS) di seluruh tabel.
   - Master data awal (Ruangan, Jenis Limbah B3 Fasyankes, Baku Mutu PermenLHK P.68/2016, Transporter Berizin).

### Langkah 2: Buat Private Storage Bucket
1. Di dashboard Supabase, buka menu **Storage**.
2. Klik **New Bucket**, beri nama: `clinic-documents`.
3. **PENTING**: Pastikan opsi **Public bucket** dalam keadaan **NONAKTIF (OFF)** demi keamanan data internal medis.
4. Jalankan skrip `supabase/migrations/04_storage_setup.sql` di SQL Editor agar hanya petugas yang terautentikasi yang dapat mengakses dokumen.

### Langkah 3: Buat Akun Petugas / Admin di Supabase Auth
1. Buka menu **Authentication** -> **Users** di dashboard Supabase.
2. Klik **Add User** -> **Create User**.
3. Masukkan email dan password petugas (contoh: `admin@klinik-asysyifa.com` / `password-kuat-anda`).
4. Centang opsi **Auto Confirm User?** lalu klik **Create User**.

### Langkah 4: Hubungkan Frontend ke Supabase
Anda dapat menghubungkan frontend dengan salah satu cara berikut:
- **Cara A (Melalui Source Code)**: Buka file `assets/js/config.js` dan isi `SUPABASE_URL` serta `SUPABASE_ANON_KEY` dari menu *Project Settings -> API* di Supabase.
- **Cara B (Melalui Tampilan Web)**: Buka menu **Pengaturan Aplikasi** di antarmuka web, masukkan URL dan Anon Key Anda, klik **Uji Koneksi**, lalu klik **Simpan**.

*Catatan: Sistem secara otomatis menyediakan fallback mode interaktif lokal (demo) jika kredensial Supabase belum dimasukkan.*

### Langkah 5: Aktifkan GitHub Pages pada Repository
1. Buka repositori Anda di GitHub: `https://github.com/onlineasysyifa/amdal`.
2. Klik tab **Settings** -> **Pages** (di kolom kiri).
3. Pada bagian **Build and deployment** -> **Source**, pilih opsi **GitHub Actions**.
4. Workflow `.github/workflows/deploy.yml` akan secara otomatis mempublikasikan aplikasi setiap ada pembaharuan pada branch `main`.

---

## 4. Akun Default & Demo
Untuk mencoba aplikasi dalam mode demo sebelum kredensial Supabase live dimasukkan:
- **Email**: `admin@klinik-asysyifa.com`
- **Password**: `admin123`

---

## 5. Lisensi dan Hak Cipta
Dikembangkan untuk **Klinik Pratama Asy-Syifa**. Seluruh standar baku mutu air limbah dan klasifikasi limbah B3 mengacu pada regulasi lingkungan hidup Republik Indonesia (PermenLHK No. P.68/2016, PermenLHK No. P.56/2015, dan PP No. 22/2021).
