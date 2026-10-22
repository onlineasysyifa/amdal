/**
 * Supabase Client Wrapper & Data Access Layer
 * Klinik Asy-Syifa Environmental Management System
 */

const SupabaseService = {
  client: null,
  isLive: false,
  currentUser: null,

  init() {
    const config = window.APP_CONFIG;
    const isValidUrl = config.SUPABASE_URL && !config.SUPABASE_URL.includes("your-project-id");
    const isValidKey = config.SUPABASE_ANON_KEY && !config.SUPABASE_ANON_KEY.includes("placeholder-anon-key");

    if (window.supabase && isValidUrl && isValidKey) {
      try {
        this.client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        this.isLive = true;
        console.log("Supabase Client initialized successfully in LIVE mode.");
      } catch (err) {
        console.error("Failed to initialize Supabase client:", err);
        this.isLive = false;
      }
    } else {
      console.warn("Supabase credentials not configured or placeholder detected. Operating in Local Demo Mode.");
      this.isLive = false;
      this.initLocalMockData();
    }
  },

  // Check Supabase connection health
  async testConnection() {
    if (!this.client) {
      return { success: false, message: "Klien Supabase belum dikonfigurasi." };
    }
    try {
      const { data, error } = await this.client.from("application_settings").select("key").limit(1);
      if (error) throw error;
      return { success: true, message: "Koneksi ke Supabase PostgreSQL berhasil!" };
    } catch (err) {
      return { success: false, message: `Gagal terhubung ke Supabase: ${err.message}` };
    }
  },

  // --------------------------------------------------------------------------
  // AUTHENTICATION METHODS
  // --------------------------------------------------------------------------
  async getSession() {
    if (this.isLive && this.client) {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        return null;
      }
      this.currentUser = session?.user || null;
      return session;
    }
    // Local demo mode: check localStorage mock session
    const mockUser = localStorage.getItem("asyifa_mock_user");
    if (mockUser) {
      this.currentUser = JSON.parse(mockUser);
      return { user: this.currentUser };
    }
    return null;
  },

  async login(email, password) {
    if (this.isLive && this.client) {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      this.currentUser = data.user;
      await this.recordAuditLog("LOGIN", "auth.users", data.user.id, null, { email });
      return data;
    }

    // Local demo fallback: default credentials admin@klinik-asysyifa.com / admin123
    if ((email === "admin@klinik-asysyifa.com" && password === "admin123") || (email && password.length >= 6)) {
      const mockUser = {
        id: "mock-user-1",
        email: email,
        user_metadata: { full_name: "Admin Sanitarian Asy-Syifa", role: "admin" }
      };
      localStorage.setItem("asyifa_mock_user", JSON.stringify(mockUser));
      this.currentUser = mockUser;
      return { user: mockUser };
    } else {
      throw new Error("Email atau password tidak sesuai. Gunakan demo: admin@klinik-asysyifa.com / admin123");
    }
  },

  async logout() {
    if (this.isLive && this.client) {
      if (this.currentUser) {
        await this.recordAuditLog("LOGOUT", "auth.users", this.currentUser.id, null, { email: this.currentUser.email });
      }
      await this.client.auth.signOut();
    }
    localStorage.removeItem("asyifa_mock_user");
    this.currentUser = null;
    return true;
  },

  async resetPassword(email) {
    if (this.isLive && this.client) {
      const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
      return data;
    }
    return { success: true, message: "Tautan pemulihan simulasi dikirim ke " + email };
  },

  // --------------------------------------------------------------------------
  // AUDIT LOGGING
  // --------------------------------------------------------------------------
  async recordAuditLog(action, entity, recordId, oldData = null, newData = null) {
    const logEntry = {
      action,
      entity,
      record_id: String(recordId),
      old_data: oldData,
      new_data: newData,
      performed_by: this.currentUser?.id || null,
      created_at: new Date().toISOString()
    };

    if (this.isLive && this.client) {
      try {
        await this.client.from("audit_logs").insert([logEntry]);
      } catch (err) {
        console.warn("Failed to write to audit_logs table:", err);
      }
    } else {
      const logs = JSON.parse(localStorage.getItem("asyifa_mock_audit_logs") || "[]");
      logs.unshift(logEntry);
      if (logs.length > 500) logs.pop();
      localStorage.setItem("asyifa_mock_audit_logs", JSON.stringify(logs));
    }
  },

  // --------------------------------------------------------------------------
  // STORAGE SERVICE (Upload and Download Document Attachments)
  // --------------------------------------------------------------------------
  async uploadDocument(file, folder = "general") {
    if (!file) throw new Error("File tidak ditemukan.");

    const ext = file.name.split(".").pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${folder}/${Date.now()}_${cleanFileName}`;

    if (this.isLive && this.client) {
      const { data, error } = await this.client.storage
        .from(window.APP_CONFIG.STORAGE_BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      // Get signed URL (valid for 2 hours)
      const { data: signedData, error: signedErr } = await this.client.storage
        .from(window.APP_CONFIG.STORAGE_BUCKET)
        .createSignedUrl(filePath, 7200);

      return {
        path: filePath,
        name: file.name,
        size: file.size,
        url: signedData ? signedData.signedUrl : filePath
      };
    }

    // Local demo simulation: convert to data URI or object URL
    return {
      path: filePath,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file)
    };
  },

  // --------------------------------------------------------------------------
  // GENERIC DATA OPERATIONS (with fallback to local reactive mock DB)
  // --------------------------------------------------------------------------
  async select(table, options = {}) {
    if (this.isLive && this.client) {
      let query = this.client.from(table).select(options.select || "*");
      if (options.eq) {
        Object.entries(options.eq).forEach(([k, v]) => { query = query.eq(k, v); });
      }
      if (options.gte) {
        Object.entries(options.gte).forEach(([k, v]) => { query = query.gte(k, v); });
      }
      if (options.lte) {
        Object.entries(options.lte).forEach(([k, v]) => { query = query.lte(k, v); });
      }
      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }

    // Mock DB Read
    return this.mockSelect(table, options);
  },

  async insert(table, records) {
    const list = Array.isArray(records) ? records : [records];
    if (this.isLive && this.client) {
      const { data, error } = await this.client.from(table).insert(list).select();
      if (error) throw error;
      if (data && data[0]) {
        await this.recordAuditLog("INSERT", table, data[0].id || "new", null, data[0]);
      }
      return data;
    }

    // Mock DB Insert
    return this.mockInsert(table, list);
  },

  async update(table, id, values) {
    if (this.isLive && this.client) {
      const { data, error } = await this.client.from(table).update(values).eq("id", id).select();
      if (error) throw error;
      await this.recordAuditLog("UPDATE", table, id, null, values);
      return data;
    }

    // Mock DB Update
    return this.mockUpdate(table, id, values);
  },

  async delete(table, id) {
    if (this.isLive && this.client) {
      const { error } = await this.client.from(table).delete().eq("id", id);
      if (error) throw error;
      await this.recordAuditLog("DELETE", table, id, null, null);
      return true;
    }

    // Mock DB Delete
    return this.mockDelete(table, id);
  },

  // --------------------------------------------------------------------------
  // LOCAL MOCK DATABASE (For seamless offline testing & GitHub Pages demo)
  // --------------------------------------------------------------------------
  initLocalMockData() {
    if (!localStorage.getItem("asyifa_mock_initialized")) {
      const rooms = [
        { id: "r1", kode_ruangan: "IGD-01", nama_ruangan: "Instalasi Gawat Darurat (IGD)", penanggung_jawab: "Ns. Budi Santoso, S.Kep", lokasi_gedung: "Gedung A Lt 1", is_active: true },
        { id: "r2", kode_ruangan: "POLI-01", nama_ruangan: "Poli Umum", penanggung_jawab: "dr. Siti Aminah", lokasi_gedung: "Gedung A Lt 1", is_active: true },
        { id: "r3", kode_ruangan: "POLI-02", nama_ruangan: "Poli Gigi & Mulut", penanggung_jawab: "drg. Hendra Pratama", lokasi_gedung: "Gedung A Lt 2", is_active: true },
        { id: "r4", kode_ruangan: "LAB-01", nama_ruangan: "Laboratorium Medis", penanggung_jawab: "Rina Wulandari, A.Md.AK", lokasi_gedung: "Gedung B Lt 1", is_active: true },
        { id: "r5", kode_ruangan: "RAWAT-01", nama_ruangan: "Ruang Rawat Inap", penanggung_jawab: "Ns. Rudi Hartono, S.Kep", lokasi_gedung: "Gedung B Lt 2", is_active: true },
        { id: "r6", kode_ruangan: "VK-01", nama_ruangan: "Kamar Bersalin (VK)", penanggung_jawab: "Bdn. Nur Hasanah, S.Tr.Keb", lokasi_gedung: "Gedung B Lt 1", is_active: true }
      ];

      const waste_types = [
        { id: "w1", kode_limbah: "A337-1", nama_limbah: "Limbah Infeksius (Kasa, Kapas, Masker)", kategori: "Kategori 1", karakteristik: "Infeksius", satuan: "kg", max_storage_days: 90, petunjuk_penanganan: "Plastik kuning biohazard", is_active: true },
        { id: "w2", kode_limbah: "A337-2", nama_limbah: "Limbah Benda Tajam (Spuit, Jarum, Bisturi)", kategori: "Kategori 1", karakteristik: "Infeksius & Tertusuk", satuan: "kg", max_storage_days: 90, petunjuk_penanganan: "Safety box kuning", is_active: true },
        { id: "w3", kode_limbah: "A337-3", nama_limbah: "Limbah Patologi & Cairan Tubuh", kategori: "Kategori 1", karakteristik: "Infeksius / Patologis", satuan: "kg", max_storage_days: 90, petunjuk_penanganan: "Plastik kuning tebal / pendingin", is_active: true },
        { id: "w4", kode_limbah: "A337-4", nama_limbah: "Sisa Reagen Kimia Laboratorium", kategori: "Kategori 2", karakteristik: "Beracun & Korosif", satuan: "liter", max_storage_days: 90, petunjuk_penanganan: "Jerigen HDPE tertutup", is_active: true },
        { id: "w5", kode_limbah: "A337-5", nama_limbah: "Limbah Farmasi Kedaluwarsa", kategori: "Kategori 2", karakteristik: "Toksik Farmasi", satuan: "kg", max_storage_days: 90, petunjuk_penanganan: "Wadah coklat khusus", is_active: true },
        { id: "w6", kode_limbah: "B337-1", nama_limbah: "Kemasan Bekas & Jerigen Medis", kategori: "Kategori 2", karakteristik: "Residu B3 Terkontaminasi", satuan: "unit", max_storage_days: 90, petunjuk_penanganan: "Dibilas dan dirusak bentuknya", is_active: true }
      ];

      const ipal_parameters = [
        { id: "p1", kode_parameter: "PH", nama_parameter: "pH (Derajat Keasaman)", satuan: "pH unit", baku_mutu_inlet: 9.0, baku_mutu_outlet: 9.0, operator_evaluasi: "range", range_min: 6.0, range_max: 9.0, is_active: true },
        { id: "p2", kode_parameter: "SUHU", nama_parameter: "Suhu", satuan: "°C", baku_mutu_inlet: 38.0, baku_mutu_outlet: 38.0, operator_evaluasi: "<=", range_max: 38.0, is_active: true },
        { id: "p3", kode_parameter: "BOD", nama_parameter: "BOD (Biochemical Oxygen Demand)", satuan: "mg/L", baku_mutu_inlet: 150.0, baku_mutu_outlet: 30.0, operator_evaluasi: "<=", range_max: 30.0, is_active: true },
        { id: "p4", kode_parameter: "COD", nama_parameter: "COD (Chemical Oxygen Demand)", satuan: "mg/L", baku_mutu_inlet: 300.0, baku_mutu_outlet: 100.0, operator_evaluasi: "<=", range_max: 100.0, is_active: true },
        { id: "p5", kode_parameter: "TSS", nama_parameter: "TSS (Total Suspended Solids)", satuan: "mg/L", baku_mutu_inlet: 200.0, baku_mutu_outlet: 30.0, operator_evaluasi: "<=", range_max: 30.0, is_active: true },
        { id: "p6", kode_parameter: "MINYAK", nama_parameter: "Minyak & Lemak", satuan: "mg/L", baku_mutu_inlet: 20.0, baku_mutu_outlet: 5.0, operator_evaluasi: "<=", range_max: 5.0, is_active: true },
        { id: "p7", kode_parameter: "AMONIA", nama_parameter: "Amoniak Bebas (NH3-N)", satuan: "mg/L", baku_mutu_inlet: 50.0, baku_mutu_outlet: 10.0, operator_evaluasi: "<=", range_max: 10.0, is_active: true },
        { id: "p8", kode_parameter: "COLIFORM", nama_parameter: "Total Coliform", satuan: "MPN/100 mL", baku_mutu_inlet: 10000.0, baku_mutu_outlet: 3000.0, operator_evaluasi: "<=", range_max: 3000.0, is_active: true }
      ];

      const transporters = [
        { id: "t1", nama_perusahaan: "PT. Wastec International", no_izin_klhk: "SK.MenLHK/001/PLB3/2023", masa_berlaku_izin: "2027-12-31", telepon: "021-8972100", no_kendaraan_default: "B 9283 TIS", is_active: true },
        { id: "t2", nama_perusahaan: "PT. Prasadha Pamunah Limbah Industri (PPLI)", no_izin_klhk: "SK.MenLHK/045/PLB3/2022", masa_berlaku_izin: "2028-06-30", telepon: "021-8674000", no_kendaraan_default: "B 9042 KFU", is_active: true }
      ];

      // Sample ipal flow records for past 7 days
      const ipal_flow_records = [];
      const today = new Date();
      let lastMeter = 12450.5;
      for (let i = 7; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const diff = Number((3.5 + Math.random() * 2.5).toFixed(2));
        const initial = lastMeter;
        lastMeter = Number((lastMeter + diff).toFixed(2));
        ipal_flow_records.push({
          id: "flow-" + i,
          tanggal: dateStr,
          waktu: "08:00",
          petugas: "Siti Rahmawati, S.Tr.Kes",
          id_meter: "FLOW-01",
          metode: "Flowmeter Kumulatif",
          meter_awal: initial,
          meter_akhir: lastMeter,
          volume: diff,
          catatan: "Debit stabil, aerasi berfungsi normal",
          status_verifikasi: "verified"
        });
      }

      // Sample waste collections and receipts
      const waste_collections = [
        {
          id: "col-1",
          no_transaksi: "TRX-20261020-001",
          tanggal: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
          waktu: "09:15",
          room_id: "r1",
          petugas_pengambil: "Ahmad Sanitarian",
          petugas_penyerah: "Ns. Budi Santoso",
          kondisi_kemasan: "Baik & Rapat",
          label_sesuai: true,
          catatan: "Pengumpulan rutin pagi",
          status: "diterima_penuh"
        },
        {
          id: "col-2",
          no_transaksi: "TRX-20261021-002",
          tanggal: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
          waktu: "10:30",
          room_id: "r4",
          petugas_pengambil: "Ahmad Sanitarian",
          petugas_penyerah: "Rina Wulandari",
          kondisi_kemasan: "Baik & Rapat",
          label_sesuai: true,
          catatan: "Sisa reagen expired & limbah infeksius lab",
          status: "diterima_penuh"
        }
      ];

      const waste_collection_items = [
        { id: "ci-1", collection_id: "col-1", waste_type_id: "w1", jumlah: 14.5, satuan: "kg", jumlah_diterima_tps: 14.5, keterangan: "Limbah kasa & sarung tangan" },
        { id: "ci-2", collection_id: "col-1", waste_type_id: "w2", jumlah: 3.2, satuan: "kg", jumlah_diterima_tps: 3.2, keterangan: "Safety box terisi 3/4" },
        { id: "ci-3", collection_id: "col-2", waste_type_id: "w1", jumlah: 8.0, satuan: "kg", jumlah_diterima_tps: 8.0, keterangan: "Limbah infeksius lab" },
        { id: "ci-4", collection_id: "col-2", waste_type_id: "w4", jumlah: 5.0, satuan: "liter", jumlah_diterima_tps: 5.0, keterangan: "Sisa reagen hematologi" }
      ];

      const tps_receipts = [
        {
          id: "rec-1",
          no_penerimaan: "RCV-20261020-001",
          tanggal_terima: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
          waktu_terima: "09:30",
          collection_id: "col-1",
          petugas_tps: "Siti Rahmawati, S.Tr.Kes",
          catatan: "Telah ditimbang di TPS, kemasan utuh",
          status: "confirmed"
        },
        {
          id: "rec-2",
          no_penerimaan: "RCV-20261021-002",
          tanggal_terima: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
          waktu_terima: "10:45",
          collection_id: "col-2",
          petugas_tps: "Siti Rahmawati, S.Tr.Kes",
          catatan: "Diterima dan ditempatkan pada palet B3",
          status: "confirmed"
        }
      ];

      const tps_receipt_items = [
        { id: "tri-1", receipt_id: "rec-1", collection_item_id: "ci-1", waste_type_id: "w1", jumlah_diterima: 14.5, satuan: "kg" },
        { id: "tri-2", receipt_id: "rec-1", collection_item_id: "ci-2", waste_type_id: "w2", jumlah_diterima: 3.2, satuan: "kg" },
        { id: "tri-3", receipt_id: "rec-2", collection_item_id: "ci-3", waste_type_id: "w1", jumlah_diterima: 8.0, satuan: "kg" },
        { id: "tri-4", receipt_id: "rec-2", collection_item_id: "ci-4", waste_type_id: "w4", jumlah_diterima: 5.0, satuan: "liter" }
      ];

      localStorage.setItem("asyifa_rooms", JSON.stringify(rooms));
      localStorage.setItem("asyifa_waste_types", JSON.stringify(waste_types));
      localStorage.setItem("asyifa_ipal_parameters", JSON.stringify(ipal_parameters));
      localStorage.setItem("asyifa_transporters", JSON.stringify(transporters));
      localStorage.setItem("asyifa_ipal_flow_records", JSON.stringify(ipal_flow_records));
      localStorage.setItem("asyifa_waste_collections", JSON.stringify(waste_collections));
      localStorage.setItem("asyifa_waste_collection_items", JSON.stringify(waste_collection_items));
      localStorage.setItem("asyifa_tps_receipts", JSON.stringify(tps_receipts));
      localStorage.setItem("asyifa_tps_receipt_items", JSON.stringify(tps_receipt_items));
      localStorage.setItem("asyifa_waste_transports", JSON.stringify([]));
      localStorage.setItem("asyifa_waste_transport_items", JSON.stringify([]));
      localStorage.setItem("asyifa_tps_adjustments", JSON.stringify([]));
      localStorage.setItem("asyifa_ipal_sampling_records", JSON.stringify([]));
      localStorage.setItem("asyifa_ipal_test_results", JSON.stringify([]));
      localStorage.setItem("asyifa_ipal_maintenance_records", JSON.stringify([]));
      localStorage.setItem("asyifa_tps_inspections", JSON.stringify([]));
      localStorage.setItem("asyifa_corrective_actions", JSON.stringify([]));
      localStorage.setItem("asyifa_mock_audit_logs", JSON.stringify([]));
      localStorage.setItem("asyifa_mock_initialized", "true");
    }
  },

  mockSelect(table, options = {}) {
    const key = `asyifa_${table}`;
    let list = JSON.parse(localStorage.getItem(key) || "[]");

    if (options.eq) {
      list = list.filter(item => {
        return Object.entries(options.eq).every(([k, v]) => String(item[k]) === String(v));
      });
    }

    if (options.gte) {
      list = list.filter(item => {
        return Object.entries(options.gte).every(([k, v]) => item[k] >= v);
      });
    }

    if (options.lte) {
      list = list.filter(item => {
        return Object.entries(options.lte).every(([k, v]) => item[k] <= v);
      });
    }

    if (options.order) {
      const col = options.order.column;
      const asc = options.order.ascending ?? true;
      list.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (options.limit) {
      list = list.slice(0, options.limit);
    }

    return list;
  },

  mockInsert(table, list) {
    const key = `asyifa_${table}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const created = list.map(item => ({
      ...item,
      id: item.id || (table.slice(0, 3) + "-" + Date.now() + Math.random().toString(36).substr(2, 4)),
      created_at: item.created_at || new Date().toISOString()
    }));
    existing.unshift(...created);
    localStorage.setItem(key, JSON.stringify(existing));
    this.recordAuditLog("INSERT", table, created[0]?.id, null, created[0]);
    return created;
  },

  mockUpdate(table, id, values) {
    const key = `asyifa_${table}`;
    let list = JSON.parse(localStorage.getItem(key) || "[]");
    let updated = null;
    list = list.map(item => {
      if (String(item.id) === String(id)) {
        updated = { ...item, ...values, updated_at: new Date().toISOString() };
        return updated;
      }
      return item;
    });
    localStorage.setItem(key, JSON.stringify(list));
    this.recordAuditLog("UPDATE", table, id, null, values);
    return updated ? [updated] : [];
  },

  mockDelete(table, id) {
    const key = `asyifa_${table}`;
    let list = JSON.parse(localStorage.getItem(key) || "[]");
    list = list.filter(item => String(item.id) !== String(id));
    localStorage.setItem(key, JSON.stringify(list));
    this.recordAuditLog("DELETE", table, id, null, null);
    return true;
  }
};

window.SupabaseService = SupabaseService;
