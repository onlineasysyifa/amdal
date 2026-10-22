-- ==============================================================================
-- SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
-- Migration 01: Initial Schema (Tabel, Foreign Key, Index, Updated_at Trigger)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Profiles Table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'petugas' CHECK (role IN ('admin', 'sanitarian', 'petugas')),
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Master Ruangan
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_ruangan TEXT NOT NULL UNIQUE,
    nama_ruangan TEXT NOT NULL,
    penanggung_jawab TEXT,
    lokasi_gedung TEXT,
    keterangan TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Master Jenis Limbah B3
CREATE TABLE IF NOT EXISTS waste_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_limbah TEXT NOT NULL UNIQUE,
    nama_limbah TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'Kategori 1' CHECK (kategori IN ('Kategori 1', 'Kategori 2', 'Non-B3 / Medis Khusus')),
    karakteristik TEXT NOT NULL,
    kode_karakteristik TEXT,
    satuan TEXT NOT NULL DEFAULT 'kg' CHECK (satuan IN ('kg', 'liter', 'unit', 'box')),
    max_storage_days INTEGER NOT NULL DEFAULT 90 CHECK (max_storage_days > 0),
    petunjuk_penanganan TEXT,
    warna_label TEXT DEFAULT '#dc3545',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_waste_types_updated_at
    BEFORE UPDATE ON waste_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Pencatatan Debit Air IPAL
CREATE TABLE IF NOT EXISTS ipal_flow_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TIME NOT NULL DEFAULT CURRENT_TIME,
    petugas TEXT NOT NULL,
    id_meter TEXT NOT NULL DEFAULT 'FLOW-01',
    metode TEXT NOT NULL DEFAULT 'Flowmeter Kumulatif' CHECK (metode IN ('Flowmeter Kumulatif', 'Flowmeter Digital', 'V-Notch', 'Manual')),
    meter_awal NUMERIC(12, 3) NOT NULL CHECK (meter_awal >= 0),
    meter_akhir NUMERIC(12, 3) NOT NULL CHECK (meter_akhir >= meter_awal),
    volume NUMERIC(12, 3) GENERATED ALWAYS AS (meter_akhir - meter_awal) STORED,
    catatan TEXT,
    status_verifikasi TEXT NOT NULL DEFAULT 'verified' CHECK (status_verifikasi IN ('verified', 'pending', 'invalid')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ipal_flow_records_updated_at
    BEFORE UPDATE ON ipal_flow_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Master Parameter Baku Mutu Air Limbah (PermenLHK No. P.68/2016 atau regulasi fasyankes)
CREATE TABLE IF NOT EXISTS ipal_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_parameter TEXT NOT NULL UNIQUE,
    nama_parameter TEXT NOT NULL,
    satuan TEXT NOT NULL,
    baku_mutu_inlet NUMERIC(10, 2),
    baku_mutu_outlet NUMERIC(10, 2) NOT NULL,
    operator_evaluasi TEXT NOT NULL DEFAULT '<=' CHECK (operator_evaluasi IN ('<=', '>=', 'range')),
    range_min NUMERIC(10, 2),
    range_max NUMERIC(10, 2),
    metode_uji TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ipal_parameters_updated_at
    BEFORE UPDATE ON ipal_parameters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Pengambilan Sampel IPAL (Inlet & Outlet)
CREATE TABLE IF NOT EXISTS ipal_sampling_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_sampel TEXT NOT NULL UNIQUE,
    tanggal_sampling DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_sampling TIME NOT NULL DEFAULT CURRENT_TIME,
    titik_sampling TEXT NOT NULL CHECK (titik_sampling IN ('inlet', 'outlet')),
    jenis_pemeriksaan TEXT NOT NULL CHECK (jenis_pemeriksaan IN ('lapangan', 'laboratorium')),
    lab_penguji TEXT,
    no_laporan TEXT,
    suhu_lapangan NUMERIC(5, 2),
    ph_lapangan NUMERIC(4, 2),
    debit_saat_sampling NUMERIC(10, 2),
    catatan TEXT,
    tindak_lanjut TEXT,
    lampiran_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ipal_sampling_records_updated_at
    BEFORE UPDATE ON ipal_sampling_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Hasil Uji Parameter IPAL (Many-to-one dengan ipal_sampling_records)
CREATE TABLE IF NOT EXISTS ipal_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sampling_id UUID NOT NULL REFERENCES ipal_sampling_records(id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES ipal_parameters(id),
    nilai_hasil NUMERIC(10, 3) NOT NULL,
    status_evaluasi TEXT NOT NULL CHECK (status_evaluasi IN ('memenuhi', 'melebihi')),
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sampling_parameter UNIQUE (sampling_id, parameter_id)
);

CREATE TRIGGER trg_ipal_test_results_updated_at
    BEFORE UPDATE ON ipal_test_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Pemeliharaan IPAL
CREATE TABLE IF NOT EXISTS ipal_maintenance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TIME NOT NULL DEFAULT CURRENT_TIME,
    kondisi_unit TEXT NOT NULL,
    pekerjaan TEXT NOT NULL,
    komponen TEXT NOT NULL,
    petugas TEXT NOT NULL,
    tindak_lanjut TEXT,
    biaya NUMERIC(12, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'selesai' CHECK (status IN ('selesai', 'dalam_proses', 'perlu_tindak_lanjut')),
    lampiran_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_ipal_maintenance_records_updated_at
    BEFORE UPDATE ON ipal_maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Transaksi Pengumpulan Limbah B3 dari Ruangan
CREATE TABLE IF NOT EXISTS waste_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_transaksi TEXT NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TIME NOT NULL DEFAULT CURRENT_TIME,
    room_id UUID NOT NULL REFERENCES rooms(id),
    petugas_pengambil TEXT NOT NULL,
    petugas_penyerah TEXT NOT NULL,
    kondisi_kemasan TEXT NOT NULL DEFAULT 'Baik & Rapat',
    label_sesuai BOOLEAN NOT NULL DEFAULT true,
    catatan TEXT,
    status TEXT NOT NULL DEFAULT 'pending_tps' CHECK (status IN ('pending_tps', 'diterima_sebagian', 'diterima_penuh', 'dibatalkan')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_waste_collections_updated_at
    BEFORE UPDATE ON waste_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Detail Item Pengumpulan Limbah B3 (Multi-item)
CREATE TABLE IF NOT EXISTS waste_collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES waste_collections(id) ON DELETE CASCADE,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id),
    jumlah NUMERIC(10, 3) NOT NULL CHECK (jumlah > 0),
    satuan TEXT NOT NULL CHECK (satuan IN ('kg', 'liter', 'unit', 'box')),
    jumlah_diterima_tps NUMERIC(10, 3) NOT NULL DEFAULT 0 CHECK (jumlah_diterima_tps >= 0),
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Penerimaan Fisik di TPS
CREATE TABLE IF NOT EXISTS tps_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_penerimaan TEXT NOT NULL UNIQUE,
    tanggal_terima DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_terima TIME NOT NULL DEFAULT CURRENT_TIME,
    collection_id UUID NOT NULL REFERENCES waste_collections(id),
    petugas_tps TEXT NOT NULL,
    kondisi_kemasan_tps TEXT NOT NULL DEFAULT 'Sesuai Standar',
    catatan TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'dibatalkan')),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tps_receipts_updated_at
    BEFORE UPDATE ON tps_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Detail Item Penerimaan TPS
CREATE TABLE IF NOT EXISTS tps_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID NOT NULL REFERENCES tps_receipts(id) ON DELETE CASCADE,
    collection_item_id UUID REFERENCES waste_collection_items(id) ON DELETE SET NULL,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id),
    jumlah_diterima NUMERIC(10, 3) NOT NULL CHECK (jumlah_diterima > 0),
    satuan TEXT NOT NULL CHECK (satuan IN ('kg', 'liter', 'unit', 'box')),
    kondisi_kemasan TEXT DEFAULT 'Baik',
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Master Perusahaan Pengangkut / Pengolah Limbah B3
CREATE TABLE IF NOT EXISTS transporters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_perusahaan TEXT NOT NULL,
    no_izin_klhk TEXT NOT NULL,
    no_rekom_kemenhub TEXT,
    masa_berlaku_izin DATE NOT NULL,
    kontak_person TEXT,
    telepon TEXT,
    email TEXT,
    alamat TEXT,
    no_kendaraan_default TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_transporters_updated_at
    BEFORE UPDATE ON transporters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Pengangkutan Keluar dari TPS ke Pihak Ketiga
CREATE TABLE IF NOT EXISTS waste_transports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_manifest TEXT NOT NULL UNIQUE,
    tanggal_angkut DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu_angkut TIME NOT NULL DEFAULT CURRENT_TIME,
    transporter_id UUID NOT NULL REFERENCES transporters(id),
    tujuan_pengelolaan TEXT NOT NULL,
    no_kendaraan TEXT NOT NULL,
    nama_pengemudi TEXT NOT NULL,
    petugas_penyerah TEXT NOT NULL,
    status_dokumen TEXT NOT NULL DEFAULT 'menunggu_bast' CHECK (status_dokumen IN ('lengkap', 'menunggu_bast', 'menunggu_sertifikat')),
    status_pengangkutan TEXT NOT NULL DEFAULT 'confirmed' CHECK (status_pengangkutan IN ('confirmed', 'dibatalkan')),
    catatan TEXT,
    bukti_timbang_url TEXT,
    bukti_terima_url TEXT,
    dokumen_manifest_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_waste_transports_updated_at
    BEFORE UPDATE ON waste_transports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Detail Item Pengangkutan Keluar
CREATE TABLE IF NOT EXISTS waste_transport_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transport_id UUID NOT NULL REFERENCES waste_transports(id) ON DELETE CASCADE,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id),
    jumlah_angkut NUMERIC(10, 3) NOT NULL CHECK (jumlah_angkut > 0),
    satuan TEXT NOT NULL CHECK (satuan IN ('kg', 'liter', 'unit', 'box')),
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Penyesuaian Stok TPS (Disetujui & Tervalidasi)
CREATE TABLE IF NOT EXISTS tps_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_penyesuaian TEXT NOT NULL UNIQUE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id),
    tipe_penyesuaian TEXT NOT NULL CHECK (tipe_penyesuaian IN ('tambah', 'kurang')),
    jumlah NUMERIC(10, 3) NOT NULL CHECK (jumlah > 0),
    satuan TEXT NOT NULL CHECK (satuan IN ('kg', 'liter', 'unit', 'box')),
    alasan TEXT NOT NULL,
    disetujui_oleh TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Pemeriksaan Kondisi Fisik & Sarana TPS
CREATE TABLE IF NOT EXISTS tps_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    waktu TIME NOT NULL DEFAULT CURRENT_TIME,
    petugas TEXT NOT NULL,
    suhu_ruangan NUMERIC(5, 2),
    kebersihan TEXT NOT NULL DEFAULT 'baik' CHECK (kebersihan IN ('baik', 'cukup', 'kurang')),
    ventilasi TEXT NOT NULL DEFAULT 'baik' CHECK (ventilasi IN ('baik', 'cukup', 'kurang')),
    spillage_kit BOOLEAN NOT NULL DEFAULT true,
    apar BOOLEAN NOT NULL DEFAULT true,
    simbol_label BOOLEAN NOT NULL DEFAULT true,
    pencahayaan TEXT NOT NULL DEFAULT 'baik' CHECK (pencahayaan IN ('baik', 'cukup', 'kurang')),
    status_kelayakan TEXT NOT NULL DEFAULT 'layak' CHECK (status_kelayakan IN ('layak', 'perlu_perbaikan', 'tidak_layak')),
    catatan TEXT,
    lampiran_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tps_inspections_updated_at
    BEFORE UPDATE ON tps_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. Tindakan Korektif (Corrective Actions)
CREATE TABLE IF NOT EXISTS corrective_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sumber_masalah TEXT NOT NULL CHECK (sumber_masalah IN ('IPAL', 'TPS', 'Limbah B3', 'Lainnya')),
    tanggal_temuan DATE NOT NULL DEFAULT CURRENT_DATE,
    deskripsi_temuan TEXT NOT NULL,
    tindakan_korektif TEXT NOT NULL,
    penanggung_jawab TEXT NOT NULL,
    batas_waktu DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    tanggal_selesai DATE,
    catatan_verifikasi TEXT,
    lampiran_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. Dokumen Lampiran Terpusat
CREATE TABLE IF NOT EXISTS document_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Persetujuan Laporan (Report Approvals)
CREATE TABLE IF NOT EXISTS report_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jenis_laporan TEXT NOT NULL,
    periode_awal DATE NOT NULL,
    periode_akhir DATE NOT NULL,
    disiapkan_oleh TEXT NOT NULL,
    disetujui_oleh TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disetujui' CHECK (status IN ('draft', 'diajukan', 'disetujui')),
    catatan TEXT,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Audit Logs (Aktivitas Penting)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. Pengaturan Aplikasi & Metadata Klinik Asy-Syifa
CREATE TABLE IF NOT EXISTS application_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_application_settings_updated_at
    BEFORE UPDATE ON application_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_ipal_flow_tanggal ON ipal_flow_records(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_ipal_sampling_tanggal ON ipal_sampling_records(tanggal_sampling DESC);
CREATE INDEX IF NOT EXISTS idx_waste_collections_tanggal ON waste_collections(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_waste_collections_room ON waste_collections(room_id);
CREATE INDEX IF NOT EXISTS idx_tps_receipts_tanggal ON tps_receipts(tanggal_terima DESC);
CREATE INDEX IF NOT EXISTS idx_waste_transports_tanggal ON waste_transports(tanggal_angkut DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(status);
