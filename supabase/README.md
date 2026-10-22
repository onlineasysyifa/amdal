# Panduan Setup Database & Storage Supabase - Klinik Asy-Syifa

Repositori ini menggunakan Supabase PostgreSQL untuk penyimpanan data, Supabase Auth untuk autentikasi pengguna, dan Supabase Storage untuk berkas dokumen operasional.

## 1. Menjalankan SQL Migration di Supabase
1. Masuk ke dashboard Supabase: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Buka project Anda.
3. Masuk ke menu **SQL Editor** di sisi kiri.
4. Klik **New Query**.
5. Buka file `supabase/all_in_one_setup.sql` di repository ini, salin seluruh kodenya, lalu tempel ke SQL Editor.
6. Klik tombol **Run** (atau tekan `Ctrl+Enter` / `Cmd+Enter`).
7. Pastikan pesan eksekusi menunjukkan **Success. No rows returned**.

Skrip ini akan secara otomatis membuat:
- 21 tabel operasional dan master data.
- Trigger `updated_at` otomatis.
- Trigger auto-create profil ketika user terdaftar di Supabase Auth.
- Row Level Security (RLS) pada seluruh tabel (pengguna anonim diblokir penuh).
- View penghitungan stok TPS (`v_tps_stock`) dan riwayat mutasi (`v_tps_mutasi_history`).
- Seed data awal master ruangan, jenis limbah B3 fasyankes, parameter baku mutu air limbah (PermenLHK No. P.68/2016), dan transporter berizin.

---

## 2. Membuat Private Storage Bucket
Dokumen klinis, bukti timbang, manifest pengangkutan, dan hasil laboratorium disimpan dalam bucket privat:
1. Buka menu **Storage** di dashboard Supabase.
2. Klik **New Bucket**.
3. Beri nama bucket persis: `clinic-documents`.
4. **PENTING**: Biarkan opsi **Public bucket** dalam keadaan **OFF (TIDAK AKTIF)**.
5. Jalankan query dari `supabase/migrations/04_storage_setup.sql` di SQL Editor untuk menerapkan kebijakan akses RLS Storage sehingga hanya petugas yang telah login yang dapat mengunggah dan mengunduh berkas.

---

## 3. Membuat Akun Admin / Petugas
1. Buka menu **Authentication** -> **Users** di dashboard Supabase.
2. Klik tombol **Add User** -> **Create User**.
3. Masukkan:
   - **Email**: contoh `admin@klinik-asysyifa.com` atau email petugas resmi.
   - **Password**: password aman (minimal 8 karakter kombinasi).
   - Pastikan opsi **Auto Confirm User?** dicentang agar tidak memerlukan verifikasi email manual.
4. Klik **Create User**.
5. Akun tersebut langsung aktif dan dapat digunakan untuk login ke aplikasi.

---

## 4. Konfigurasi Frontend
Buka file `assets/js/config.js` di source code atau atur melalui menu **Pengaturan Aplikasi** di antarmuka web:
```javascript
window.ENV = {
    SUPABASE_URL: "https://your-project-id.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
};
```
*Catatan: Hanya masukkan `SUPABASE_URL` dan `Anon/Publishable Key`. JANGAN PERNAH memasukkan `service_role` secret key ke dalam kode frontend!*
