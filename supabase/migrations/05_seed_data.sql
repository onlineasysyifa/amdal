-- ==============================================================================
-- SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
-- Migration 05: Seed Data Master (Ruangan, Limbah B3, Parameter IPAL, Transporter, Settings)
-- ==============================================================================

-- 1. Master Ruangan
INSERT INTO rooms (kode_ruangan, nama_ruangan, penanggung_jawab, lokasi_gedung, keterangan, is_active) VALUES
('IGD-01', 'Instalasi Gawat Darurat (IGD)', 'Ns. Budi Santoso, S.Kep', 'Gedung A Lantai 1', 'Pelayanan gawat darurat & tindakan medis darurat', true),
('POLI-01', 'Poli Umum', 'dr. Siti Aminah', 'Gedung A Lantai 1', 'Pemeriksaan rawat jalan pasien umum', true),
('POLI-02', 'Poli Gigi & Mulut', 'drg. Hendra Pratama', 'Gedung A Lantai 2', 'Tindakan perawatan gigi dan mulut', true),
('POLI-03', 'Poli KIA / KB', 'Bdn. Maryam, S.Tr.Keb', 'Gedung A Lantai 2', 'Kesehatan ibu, anak, dan imunisasi', true),
('LAB-01', 'Laboratorium Medis', 'Rina Wulandari, A.Md.AK', 'Gedung B Lantai 1', 'Pemeriksaan hematologi, urin, kimia darah', true),
('FAR-01', 'Instalasi Farmasi / Apotek', 'Apt. Dewi Lestari, S.Farm', 'Gedung A Lantai 1', 'Pengelolaan perbekalan farmasi & obat', true),
('RAWAT-01', 'Ruang Rawat Inap (Dewasa & Anak)', 'Ns. Rudi Hartono, S.Kep', 'Gedung B Lantai 2', 'Perawatan pasien inap', true),
('VK-01', 'Kamar Bersalin (VK)', 'Bdn. Nur Hasanah, S.Tr.Keb', 'Gedung B Lantai 1', 'Pelayanan persalinan normal', true),
('CSSD-01', 'Ruang Sterilisasi (CSSD)', 'Agus Setiawan, A.Md.Kes', 'Gedung B Lantai 1', 'Sterilisasi instrumen medis', true)
ON CONFLICT (kode_ruangan) DO NOTHING;

-- 2. Master Jenis Limbah B3 (PP 22/2021 & PermenLHK P.56/2015)
INSERT INTO waste_types (kode_limbah, nama_limbah, kategori, karakteristik, kode_karakteristik, satuan, max_storage_days, petunjuk_penanganan, warna_label, is_active) VALUES
('A337-1', 'Limbah Infeksius (Kasa, Kapas, Masker, Handscoon Terkontaminasi)', 'Kategori 1', 'Infeksius', 'INF', 'kg', 90, 'Wadah berkantong kuning berlogo biohazard, tertutup rapat, tahan bocor', '#ffc107', true),
('A337-2', 'Limbah Benda Tajam (Spuit, Jarum, Bisturi, Lancet, Ampul)', 'Kategori 1', 'Infeksius & Tertusuk', 'SHARP', 'kg', 90, 'Safety box warna kuning tahan tusukan dan air, ditutup saat 3/4 penuh', '#dc3545', true),
('A337-3', 'Limbah Patologi (Jaringan, Organ, Cairan Tubuh, Darah)', 'Kategori 1', 'Infeksius / Patologis', 'PAT', 'kg', 90, 'Kantong kuning tebal, simpan pada suhu dingin/freezer jika > 48 jam', '#fd7e14', true),
('A337-4', 'Limbah Bahan Kimia Kedaluwarsa / Sisa Reagen Laboratorium', 'Kategori 2', 'Beracun & Korosif', 'TOX-COR', 'liter', 90, 'Jerigen HDPE tertutup rapat tahan bahan kimia dengan label bahaya', '#6f42c1', true),
('A337-5', 'Limbah Farmasi Kedaluwarsa (Obat Sisa, Tablet, Sirup, Residu)', 'Kategori 2', 'Toksik Farmasi', 'PHARM', 'kg', 90, 'Wadah coklat/label coklat, simpan terpisah dari limbah umum', '#6c757d', true),
('B337-1', 'Kemasan Bekas Produk Medis & Jerigen Desinfektan', 'Kategori 2', 'Residu B3 Terkontaminasi', 'CONTAM', 'unit', 90, 'Dibilas dan dirusak bentuknya sebelum disimpan di TPS limbah B3', '#20c997', true),
('A102d', 'Lampu TL / Neon Bekas Mengandung Merkuri', 'Kategori 2', 'Beracun (Merkuri)', 'MERC', 'unit', 90, 'Kemasan karton asli/khusus, hindari benturan agar tabung tidak pecah', '#0dcaf0', true),
('A108d', 'Baterai Bekas & Akumulator Alat Medis', 'Kategori 2', 'Korosif & Toksik Logam Berat', 'BATT', 'unit', 90, 'Wadah plastik kedap asam dan cairan elektrolit', '#e83e8c', true)
ON CONFLICT (kode_limbah) DO NOTHING;

-- 3. Master Parameter Baku Mutu Air Limbah Fasyankes (PermenLHK No. P.68 Tahun 2016)
INSERT INTO ipal_parameters (kode_parameter, nama_parameter, satuan, baku_mutu_inlet, baku_mutu_outlet, operator_evaluasi, range_min, range_max, metode_uji, display_order, is_active) VALUES
('PH', 'pH (Derajat Keasaman)', 'pH unit', 9.00, 9.00, 'range', 6.00, 9.00, 'SNI 06-6989.11-2004 (Elektrometri)', 1, true),
('SUHU', 'Suhu', '°C', 38.00, 38.00, '<=', NULL, 38.00, 'SNI 06-6989.23-2005 (Termometrik)', 2, true),
('BOD', 'BOD (Biochemical Oxygen Demand)', 'mg/L', 150.00, 30.00, '<=', NULL, 30.00, 'SNI 6989.72:2009 (Winkler / Elektrometri)', 3, true),
('COD', 'COD (Chemical Oxygen Demand)', 'mg/L', 300.00, 100.00, '<=', NULL, 100.00, 'SNI 6989.2:2019 (Refluks Tertutup Spektrofotometri)', 4, true),
('TSS', 'TSS (Total Suspended Solids)', 'mg/L', 200.00, 30.00, '<=', NULL, 30.00, 'SNI 6989.3:2019 (Gravimetri)', 5, true),
('MINYAK', 'Minyak & Lemak', 'mg/L', 20.00, 5.00, '<=', NULL, 5.00, 'SNI 6989.10:2011 (Gravimetri)', 6, true),
('AMONIA', 'Amoniak Bebas (NH3-N)', 'mg/L', 50.00, 10.00, '<=', NULL, 10.00, 'SNI 06-6989.30-2005 (Fenat Spektrofotometri)', 7, true),
('COLIFORM', 'Total Coliform', 'MPN/100 mL', 10000.00, 3000.00, '<=', NULL, 3000.00, 'Metode Tabung Ganda (MPN) / APM', 8, true)
ON CONFLICT (kode_parameter) DO NOTHING;

-- 4. Master Perusahaan Pengangkut / Transporter Berizin
INSERT INTO transporters (nama_perusahaan, no_izin_klhk, no_rekom_kemenhub, masa_berlaku_izin, kontak_person, telepon, email, alamat, no_kendaraan_default, is_active) VALUES
('PT. Wastec International', 'SK.MenLHK/001/PLB3/2023', 'SK.2301/AJ.309/DJPD/2023', '2027-12-31', 'Bambang Wijaya', '021-8972100', 'operasional@wastec.co.id', 'Kawasan Industri Jababeka Blok C-12, Cikarang', 'B 9283 TIS', true),
('PT. Prasadha Pamunah Limbah Industri (PPLI)', 'SK.MenLHK/045/PLB3/2022', 'SK.1844/AJ.309/DJPD/2022', '2028-06-30', 'Hendra Kusuma', '021-8674000', 'info@ppli.co.id', 'Jl. Raya Narogong Km. 14, Klapanunggal, Bogor', 'B 9042 KFU', true)
ON CONFLICT DO NOTHING;

-- 5. Pengaturan Aplikasi
INSERT INTO application_settings (key, value, description) VALUES
('clinic_profile', '{
    "nama_klinik": "Klinik Pratama Asy-Syifa",
    "nomor_izin": "445/012/DPMPTSP/2023",
    "alamat": "Jl. Asy-Syifa No. 07, Sukamaju, Jawa Barat",
    "telepon": "(021) 87654321",
    "email": "info@klinik-asysyifa.com",
    "kepala_klinik": "dr. H. Ahmad Fauzi, Sp.PK",
    "penanggung_jawab_sanitarian": "Siti Rahmawati, S.Tr.Kes",
    "nip_sanitarian": "19920815 202012 2 004",
    "kapasitas_ipal_m3": 15.0,
    "kapasitas_tps_kg": 1500.0
}', 'Profil dan metadata resmi identitas Klinik Pratama Asy-Syifa'),

('regulasi_baku_mutu', '{
    "nama_regulasi": "Peraturan Menteri Lingkungan Hidup dan Kehutanan No. P.68/Menlhk/Setjen/Kum.1/8/2016",
    "tentang": "Baku Mutu Air Limbah Domestik & Fasilitas Pelayanan Kesehatan",
    "tanggal_penetapan": "2016-08-01"
}', 'Regulasi standar baku mutu air limbah fasyankes')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
