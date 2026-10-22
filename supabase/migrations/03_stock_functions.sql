-- ==============================================================================
-- SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
-- Migration 03: Stock Calculation Views, Functions & RPC
-- ==============================================================================

-- 1. View: Rekap Saldo Stok TPS per Jenis Limbah dan Satuan
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

-- 2. View: Kartu Riwayat Mutasi TPS (Ledger)
CREATE OR REPLACE VIEW v_tps_mutasi_history AS
SELECT 
    tr.tanggal_terima AS tanggal,
    tr.waktu_terima AS waktu,
    'Penerimaan TPS' AS jenis_transaksi,
    tr.no_penerimaan AS no_referensi,
    tri.waste_type_id,
    wt.nama_limbah,
    tri.satuan,
    tri.jumlah_diterima AS jumlah_masuk,
    0::numeric AS jumlah_keluar,
    tr.petugas_tps AS petugas,
    COALESCE(tri.catatan, tr.catatan, 'Penerimaan dari ruangan') AS keterangan,
    tr.created_at
FROM tps_receipt_items tri
JOIN tps_receipts tr ON tr.id = tri.receipt_id
JOIN waste_types wt ON wt.id = tri.waste_type_id
WHERE tr.status = 'confirmed'

UNION ALL

SELECT 
    wt_out.tanggal_angkut AS tanggal,
    wt_out.waktu_angkut AS waktu,
    'Pengangkutan Keluar' AS jenis_transaksi,
    wt_out.no_manifest AS no_referensi,
    wti.waste_type_id,
    wt.nama_limbah,
    wti.satuan,
    0::numeric AS jumlah_masuk,
    wti.jumlah_angkut AS jumlah_keluar,
    wt_out.petugas_penyerah AS petugas,
    CONCAT('Transporter: ', tp.nama_perusahaan, ' (Kend: ', wt_out.no_kendaraan, ')') AS keterangan,
    wt_out.created_at
FROM waste_transport_items wti
JOIN waste_transports wt_out ON wt_out.id = wti.transport_id
JOIN waste_types wt ON wt.id = wti.waste_type_id
JOIN transporters tp ON tp.id = wt_out.transporter_id
WHERE wt_out.status_pengangkutan = 'confirmed'

UNION ALL

SELECT 
    ta.tanggal AS tanggal,
    '00:00:00'::time AS waktu,
    CASE WHEN ta.tipe_penyesuaian = 'tambah' THEN 'Penyesuaian Tambah' ELSE 'Penyesuaian Kurang' END AS jenis_transaksi,
    ta.no_penyesuaian AS no_referensi,
    ta.waste_type_id,
    wt.nama_limbah,
    ta.satuan,
    CASE WHEN ta.tipe_penyesuaian = 'tambah' THEN ta.jumlah ELSE 0::numeric END AS jumlah_masuk,
    CASE WHEN ta.tipe_penyesuaian = 'kurang' THEN ta.jumlah ELSE 0::numeric END AS jumlah_keluar,
    ta.disetujui_oleh AS petugas,
    ta.alasan AS keterangan,
    ta.created_at
FROM tps_adjustments ta
JOIN waste_types wt ON wt.id = ta.waste_type_id;

-- 3. Function: Validasi & Konfirmasi Penerimaan TPS (Atomic)
CREATE OR REPLACE FUNCTION rpc_confirm_tps_receipt(p_receipt_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_receipt tps_receipts%ROWTYPE;
    v_collection_id UUID;
    v_all_received BOOLEAN := true;
    v_any_received BOOLEAN := false;
    v_item RECORD;
BEGIN
    SELECT * INTO v_receipt FROM tps_receipts WHERE id = p_receipt_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data penerimaan TPS tidak ditemukan: %', p_receipt_id;
    END IF;

    IF v_receipt.status = 'confirmed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Penerimaan sudah dikonfirmasi sebelumnya');
    END IF;

    v_collection_id := v_receipt.collection_id;

    -- Update received amounts on waste_collection_items
    FOR v_item IN 
        SELECT tri.collection_item_id, tri.jumlah_diterima
        FROM tps_receipt_items tri
        WHERE tri.receipt_id = p_receipt_id AND tri.collection_item_id IS NOT NULL
    LOOP
        UPDATE waste_collection_items
        SET jumlah_diterima_tps = COALESCE(jumlah_diterima_tps, 0) + v_item.jumlah_diterima
        WHERE id = v_item.collection_item_id;
    END LOOP;

    -- Evaluate whether collection is fully received or partially received
    FOR v_item IN 
        SELECT jumlah, COALESCE(jumlah_diterima_tps, 0) AS diterima
        FROM waste_collection_items
        WHERE collection_id = v_collection_id
    LOOP
        IF v_item.diterima > 0 THEN
            v_any_received := true;
        END IF;
        IF v_item.diterima < v_item.jumlah THEN
            v_all_received := false;
        END IF;
    END LOOP;

    -- Update collection status
    IF v_all_received THEN
        UPDATE waste_collections SET status = 'diterima_penuh' WHERE id = v_collection_id;
    ELSIF v_any_received THEN
        UPDATE waste_collections SET status = 'diterima_sebagian' WHERE id = v_collection_id;
    END IF;

    -- Mark receipt as confirmed
    UPDATE tps_receipts SET status = 'confirmed' WHERE id = p_receipt_id;

    RETURN jsonb_build_object('success', true, 'message', 'Penerimaan TPS berhasil dikonfirmasi');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function: Validasi & Konfirmasi Pengangkutan Limbah Keluar (Mencegah Stok Minus)
CREATE OR REPLACE FUNCTION rpc_confirm_waste_transport(p_transport_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_transport waste_transports%ROWTYPE;
    v_item RECORD;
    v_current_stock NUMERIC;
BEGIN
    SELECT * INTO v_transport FROM waste_transports WHERE id = p_transport_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data pengangkutan tidak ditemukan: %', p_transport_id;
    END IF;

    IF v_transport.status_pengangkutan = 'confirmed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Pengangkutan sudah dikonfirmasi sebelumnya');
    END IF;

    -- Validate that sufficient stock exists for every item
    FOR v_item IN 
        SELECT wti.waste_type_id, wti.satuan, wti.jumlah_angkut, wt.nama_limbah
        FROM waste_transport_items wti
        JOIN waste_types wt ON wt.id = wti.waste_type_id
        WHERE wti.transport_id = p_transport_id
    LOOP
        SELECT COALESCE(saldo_akhir, 0) INTO v_current_stock
        FROM v_tps_stock
        WHERE waste_type_id = v_item.waste_type_id AND satuan = v_item.satuan;

        IF v_current_stock IS NULL OR v_current_stock < v_item.jumlah_angkut THEN
            RAISE EXCEPTION 'Stok tidak mencukupi untuk limbah % (%)! Stok tersedia: %, Jumlah angkut: %', 
                v_item.nama_limbah, v_item.satuan, COALESCE(v_current_stock, 0), v_item.jumlah_angkut;
        END IF;
    END LOOP;

    -- Mark transport as confirmed
    UPDATE waste_transports 
    SET status_pengangkutan = 'confirmed' 
    WHERE id = p_transport_id;

    RETURN jsonb_build_object('success', true, 'message', 'Pengangkutan berhasil dikonfirmasi dan stok telah dipotong');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
