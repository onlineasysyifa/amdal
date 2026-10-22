-- ==============================================================================
-- SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
-- ALL-IN-ONE SETUP SCRIPT (Execute in Supabase SQL Editor)
-- ==============================================================================

-- 1. EXTENSIONS & FUNCTIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TABLES DEFINITIONS
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

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_waste_types_updated_at
    BEFORE UPDATE ON waste_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_ipal_flow_records_updated_at
    BEFORE UPDATE ON ipal_flow_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_ipal_parameters_updated_at
    BEFORE UPDATE ON ipal_parameters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_ipal_sampling_records_updated_at
    BEFORE UPDATE ON ipal_sampling_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_ipal_test_results_updated_at
    BEFORE UPDATE ON ipal_test_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_ipal_maintenance_records_updated_at
    BEFORE UPDATE ON ipal_maintenance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_waste_collections_updated_at
    BEFORE UPDATE ON waste_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_tps_receipts_updated_at
    BEFORE UPDATE ON tps_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_transporters_updated_at
    BEFORE UPDATE ON transporters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_waste_transports_updated_at
    BEFORE UPDATE ON waste_transports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS waste_transport_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transport_id UUID NOT NULL REFERENCES waste_transports(id) ON DELETE CASCADE,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id),
    jumlah_angkut NUMERIC(10, 3) NOT NULL CHECK (jumlah_angkut > 0),
    satuan TEXT NOT NULL CHECK (satuan IN ('kg', 'liter', 'unit', 'box')),
    keterangan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE OR REPLACE TRIGGER trg_tps_inspections_updated_at
    BEFORE UPDATE ON tps_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE OR REPLACE TRIGGER trg_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TABLE IF NOT EXISTS application_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_application_settings_updated_at
    BEFORE UPDATE ON application_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. VIEWS & FUNCTIONS
CREATE OR REPLACE VIEW v_tps_stock AS
WITH receipts_agg AS (
    SELECT 
        tri.waste_type_id,
        tri.satuan,
        COALESCE(SUM(tri.jumlah_diterima), 0) AS total_masuk,
        MIN(tr.tanggal_terima) AS first_receipt_date,
        MAX(tr.tanggal_terima) AS last_receipt_date
    FROM tps_receipt_items tri
    JOIN tps_receipts tr ON tr.id = tri.receipt_id
    WHERE tr.status = 'confirmed'
    GROUP BY tri.waste_type_id, tri.satuan
),
transports_agg AS (
    SELECT 
        wti.waste_type_id,
        wti.satuan,
        COALESCE(SUM(wti.jumlah_angkut), 0) AS total_keluar,
        MAX(wt.tanggal_angkut) AS last_transport_date
    FROM waste_transport_items wti
    JOIN waste_transports wt ON wt.id = wti.transport_id
    WHERE wt.status_pengangkutan = 'confirmed'
    GROUP BY wti.waste_type_id, wti.satuan
),
adjustments_agg AS (
    SELECT 
        waste_type_id,
        satuan,
        COALESCE(SUM(CASE WHEN tipe_penyesuaian = 'tambah' THEN jumlah ELSE 0 END), 0) AS total_penyesuaian_tambah,
        COALESCE(SUM(CASE WHEN tipe_penyesuaian = 'kurang' THEN jumlah ELSE 0 END), 0) AS total_penyesuaian_kurang
    FROM tps_adjustments
    GROUP BY waste_type_id, satuan
),
combined_types AS (
    SELECT DISTINCT waste_type_id, satuan FROM receipts_agg
    UNION
    SELECT DISTINCT waste_type_id, satuan FROM transports_agg
    UNION
    SELECT DISTINCT waste_type_id, satuan FROM adjustments_agg
)
SELECT 
    wt.id AS waste_type_id,
    wt.kode_limbah,
    wt.nama_limbah,
    wt.kategori,
    wt.karakteristik,
    ct.satuan,
    wt.max_storage_days,
    COALESCE(r.total_masuk, 0) AS total_masuk,
    COALESCE(t.total_keluar, 0) AS total_keluar,
    COALESCE(a.total_penyesuaian_tambah, 0) AS penyesuaian_tambah,
    COALESCE(a.total_penyesuaian_kurang, 0) AS penyesuaian_kurang,
    (
        COALESCE(r.total_masuk, 0) + COALESCE(a.total_penyesuaian_tambah, 0)
        - COALESCE(t.total_keluar, 0) - COALESCE(a.total_penyesuaian_kurang, 0)
    ) AS saldo_akhir,
    r.first_receipt_date,
    r.last_receipt_date,
    t.last_transport_date,
    CASE 
        WHEN (COALESCE(r.total_masuk, 0) + COALESCE(a.total_penyesuaian_tambah, 0)
             - COALESCE(t.total_keluar, 0) - COALESCE(a.total_penyesuaian_kurang, 0)) <= 0 THEN 0
        WHEN r.first_receipt_date IS NOT NULL THEN (CURRENT_DATE - r.first_receipt_date)
        ELSE 0
    END AS days_in_storage,
    CASE 
        WHEN (COALESCE(r.total_masuk, 0) + COALESCE(a.total_penyesuaian_tambah, 0)
             - COALESCE(t.total_keluar, 0) - COALESCE(a.total_penyesuaian_kurang, 0)) <= 0 THEN 'Kosong'
        WHEN (CURRENT_DATE - COALESCE(r.first_receipt_date, CURRENT_DATE)) > wt.max_storage_days THEN 'Melebihi Batas'
        WHEN (CURRENT_DATE - COALESCE(r.first_receipt_date, CURRENT_DATE)) >= (wt.max_storage_days - 14) THEN 'Mendekati Batas'
        ELSE 'Aman'
    END AS status_masa_simpan
FROM combined_types ct
JOIN waste_types wt ON wt.id = ct.waste_type_id
LEFT JOIN receipts_agg r ON r.waste_type_id = ct.waste_type_id AND r.satuan = ct.satuan
LEFT JOIN transports_agg t ON t.waste_type_id = ct.waste_type_id AND t.satuan = ct.satuan
LEFT JOIN adjustments_agg a ON a.waste_type_id = ct.waste_type_id AND a.satuan = ct.satuan;

-- 4. RLS ENABLING & POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_flow_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_sampling_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipal_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_transport_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tps_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_settings ENABLE ROW LEVEL SECURITY;

-- Auto create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'petugas'),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies for Authenticated Role (Anonymous users have NO access to tables)
CREATE POLICY "Auth all profiles" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all rooms" ON rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all waste_types" ON waste_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all ipal_parameters" ON ipal_parameters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all transporters" ON transporters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all ipal_flow" ON ipal_flow_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all ipal_sampling" ON ipal_sampling_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all ipal_test_results" ON ipal_test_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all ipal_maintenance" ON ipal_maintenance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all waste_collections" ON waste_collections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all waste_collection_items" ON waste_collection_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all tps_receipts" ON tps_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all tps_receipt_items" ON tps_receipt_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all waste_transports" ON waste_transports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all waste_transport_items" ON waste_transport_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all tps_adjustments" ON tps_adjustments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all tps_inspections" ON tps_inspections FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all corrective_actions" ON corrective_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all document_attachments" ON document_attachments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all report_approvals" ON report_approvals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all audit_logs" ON audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth all application_settings" ON application_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. INITIAL SEED DATA
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

INSERT INTO waste_types (kode_limbah, nama_limbah, kategori, karakteristik, kode_karakteristik, satuan, max_storage_days, petunjuk_penanganan, warna_label, is_active) VALUES
('A337-1', 'Limbah Infeksius (Kasa, Kapas, Masker, Handscoon)', 'Kategori 1', 'Infeksius', 'INF', 'kg', 90, 'Wadah berkantong kuning berlogo biohazard, tertutup rapat', '#ffc107', true),
('A337-2', 'Limbah Benda Tajam (Spuit, Jarum, Bisturi, Ampul)', 'Kategori 1', 'Infeksius & Tertusuk', 'SHARP', 'kg', 90, 'Safety box warna kuning tahan tusukan dan air, isi maks 3/4', '#dc3545', true),
('A337-3', 'Limbah Patologi (Jaringan, Organ, Cairan Tubuh)', 'Kategori 1', 'Infeksius / Patologis', 'PAT', 'kg', 90, 'Kantong kuning tebal, simpan suhu dingin jika > 48 jam', '#fd7e14', true),
('A337-4', 'Limbah Sisa Bahan Kimia / Reagen Lab', 'Kategori 2', 'Beracun & Korosif', 'TOX-COR', 'liter', 90, 'Jerigen HDPE tertutup rapat berlabel bahaya', '#6f42c1', true),
('A337-5', 'Limbah Farmasi Kedaluwarsa (Obat Sisa/Kadaluwarsa)', 'Kategori 2', 'Toksik Farmasi', 'PHARM', 'kg', 90, 'Wadah coklat/label coklat, simpan terpisah dari limbah umum', '#6c757d', true),
('B337-1', 'Kemasan Bekas Produk Medis & Jerigen Bekas', 'Kategori 2', 'Residu B3 Terkontaminasi', 'CONTAM', 'unit', 90, 'Dibilas dan dirusak bentuknya sebelum disimpan di TPS', '#20c997', true),
('A102d', 'Lampu TL / Neon Bekas Ber-Merkuri', 'Kategori 2', 'Beracun (Merkuri)', 'MERC', 'unit', 90, 'Kemasan karton khusus, hindari benturan', '#0dcaf0', true),
('A108d', 'Baterai Bekas & Akumulator Alat Medis', 'Kategori 2', 'Korosif & Toksik', 'BATT', 'unit', 90, 'Wadah khusus tahan asam', '#e83e8c', true)
ON CONFLICT (kode_limbah) DO NOTHING;

INSERT INTO ipal_parameters (kode_parameter, nama_parameter, satuan, baku_mutu_inlet, baku_mutu_outlet, operator_evaluasi, range_min, range_max, metode_uji, display_order, is_active) VALUES
('PH', 'pH (Derajat Keasaman)', 'pH unit', 9.00, 9.00, 'range', 6.00, 9.00, 'SNI 06-6989.11-2004', 1, true),
('SUHU', 'Suhu', '°C', 38.00, 38.00, '<=', NULL, 38.00, 'SNI 06-6989.23-2005', 2, true),
('BOD', 'BOD (Biochemical Oxygen Demand)', 'mg/L', 150.00, 30.00, '<=', NULL, 30.00, 'SNI 6989.72:2009', 3, true),
('COD', 'COD (Chemical Oxygen Demand)', 'mg/L', 300.00, 100.00, '<=', NULL, 100.00, 'SNI 6989.2:2019', 4, true),
('TSS', 'TSS (Total Suspended Solids)', 'mg/L', 200.00, 30.00, '<=', NULL, 30.00, 'SNI 6989.3:2019', 5, true),
('MINYAK', 'Minyak & Lemak', 'mg/L', 20.00, 5.00, '<=', NULL, 5.00, 'SNI 6989.10:2011', 6, true),
('AMONIA', 'Amoniak Bebas (NH3-N)', 'mg/L', 50.00, 10.00, '<=', NULL, 10.00, 'SNI 06-6989.30-2005', 7, true),
('COLIFORM', 'Total Coliform', 'MPN/100 mL', 10000.00, 3000.00, '<=', NULL, 3000.00, 'Metode Tabung Ganda (MPN)', 8, true)
ON CONFLICT (kode_parameter) DO NOTHING;

INSERT INTO transporters (nama_perusahaan, no_izin_klhk, no_rekom_kemenhub, masa_berlaku_izin, kontak_person, telepon, email, alamat, no_kendaraan_default, is_active) VALUES
('PT. Wastec International', 'SK.MenLHK/001/PLB3/2023', 'SK.2301/AJ.309/DJPD/2023', '2027-12-31', 'Bambang Wijaya', '021-8972100', 'operasional@wastec.co.id', 'Kawasan Industri Jababeka Blok C-12, Cikarang', 'B 9283 TIS', true),
('PT. Prasadha Pamunah Limbah Industri (PPLI)', 'SK.MenLHK/045/PLB3/2022', 'SK.1844/AJ.309/DJPD/2022', '2028-06-30', 'Hendra Kusuma', '021-8674000', 'info@ppli.co.id', 'Jl. Raya Narogong Km. 14, Klapanunggal, Bogor', 'B 9042 KFU', true)
ON CONFLICT DO NOTHING;

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
}', 'Profil resmi Klinik Pratama Asy-Syifa')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
