/**
 * JsonService — Data Access Layer berbasis File JSON
 * Sistem Informasi IPAL & Limbah B3 Klinik Asy-Syifa
 *
 * Arsitektur:
 *  - Seed data dibaca dari /data/<table>.json saat pertama kali diakses (via fetch).
 *  - Seluruh perubahan (insert/update/delete) disimpan ke localStorage sebagai overlay
 *    dengan key "asyifa_<table>", sehingga data JSON asli tidak tersentuh.
 *  - Jika di localStorage sudah ada data untuk tabel tersebut, file JSON tidak di-fetch ulang.
 *  - Kompatibel penuh dengan API SupabaseService sebelumnya:
 *    select / insert / update / delete / uploadDocument / recordAuditLog / getSession / login
 */

const SupabaseService = {
  isLive: false,        // selalu false — tidak ada Supabase
  currentUser: null,

  // Tabel yang memiliki seed data di /data/
  SEED_TABLES: [
    "rooms", "waste_types", "ipal_parameters", "transporters",
    "ipal_flow_records", "ipal_sampling_records", "ipal_test_results",
    "ipal_maintenance_records", "waste_collections", "waste_collection_items",
    "tps_receipts", "tps_receipt_items", "waste_transports", "waste_transport_items",
    "tps_adjustments", "tps_inspections", "corrective_actions", "audit_logs"
  ],

  // Cache in-memory agar fetch tidak berulang dalam satu session
  _cache: {},

  // -------------------------------------------------------------------------
  // INISIALISASI
  // -------------------------------------------------------------------------
  init() {
    console.log("✅ JsonService: Berjalan dalam mode JSON Lokal. Tidak ada koneksi Supabase.");
    // Prefetch semua seed tables secara async di background
    this.SEED_TABLES.forEach(t => this._ensureLoaded(t));

    // Set default user
    this.currentUser = {
      id: "admin-asysyifa",
      email: "sanitarian@klinik-asysyifa.com",
      user_metadata: { full_name: "Siti Rahmawati, S.Tr.Kes (Sanitarian)", role: "admin" }
    };
  },

  // -------------------------------------------------------------------------
  // INTERNAL: Pastikan tabel sudah ada di localStorage (load dari JSON jika belum)
  // -------------------------------------------------------------------------
  async _ensureLoaded(table) {
    const key = `asyifa_${table}`;

    // Sudah di memory cache
    if (this._cache[key] !== undefined) return this._cache[key];

    // Sudah di localStorage
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        this._cache[key] = JSON.parse(stored);
        return this._cache[key];
      } catch {
        // corrupt data — akan di-fetch ulang
      }
    }

    // Belum ada — fetch dari file JSON seed
    if (this.SEED_TABLES.includes(table)) {
      try {
        const res = await fetch(`data/${table}.json?v=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(key, JSON.stringify(data));
          this._cache[key] = data;
          return data;
        }
      } catch (err) {
        console.warn(`JsonService: Gagal fetch data/${table}.json —`, err.message);
      }
    }

    // Default kosong
    localStorage.setItem(key, JSON.stringify([]));
    this._cache[key] = [];
    return [];
  },

  _saveTable(table, list) {
    const key = `asyifa_${table}`;
    this._cache[key] = list;
    localStorage.setItem(key, JSON.stringify(list));
  },

  _genId(table) {
    return table.slice(0, 3).replace(/[^a-z]/gi, "x") + "-" +
      Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  // -------------------------------------------------------------------------
  // AUTHENTICATION (sederhana, selalu berhasil)
  // -------------------------------------------------------------------------
  async getSession() {
    return this.currentUser ? { user: this.currentUser } : null;
  },

  async login(email, password) {
    if (email && password && password.length >= 6) {
      const user = {
        id: "user-" + Date.now(),
        email,
        user_metadata: { full_name: "Admin Sanitarian", role: "admin" }
      };
      this.currentUser = user;
      localStorage.setItem("asyifa_mock_user", JSON.stringify(user));
      return { user };
    }
    throw new Error("Email atau password tidak valid (minimal 6 karakter password).");
  },

  async logout() {
    localStorage.removeItem("asyifa_mock_user");
    this.currentUser = null;
    return true;
  },

  async signUp(email, password, fullName = "Petugas Sanitarian") {
    return this.login(email, password);
  },

  async resetPassword(email) {
    return { success: true, message: "Simulasi: tautan reset dikirim ke " + email };
  },

  // -------------------------------------------------------------------------
  // AUDIT LOG
  // -------------------------------------------------------------------------
  async recordAuditLog(action, entity, recordId, oldData = null, newData = null) {
    const entry = {
      id: this._genId("log"),
      action,
      entity,
      record_id: String(recordId),
      old_data: oldData,
      new_data: newData,
      performed_by: this.currentUser?.id || null,
      created_at: new Date().toISOString()
    };
    const logs = await this._ensureLoaded("audit_logs");
    logs.unshift(entry);
    if (logs.length > 500) logs.length = 500;
    this._saveTable("audit_logs", logs);
  },

  // -------------------------------------------------------------------------
  // STORAGE SIMULASI (upload dokumen)
  // -------------------------------------------------------------------------
  async uploadDocument(file, folder = "general") {
    if (!file) throw new Error("File tidak ditemukan.");
    const filePath = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    return {
      path: filePath,
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file)
    };
  },

  // -------------------------------------------------------------------------
  // GENERIC SELECT
  // -------------------------------------------------------------------------
  async select(table, options = {}) {
    let list = [...(await this._ensureLoaded(table))];

    // Filter: eq
    if (options.eq) {
      list = list.filter(item =>
        Object.entries(options.eq).every(([k, v]) => String(item[k]) === String(v))
      );
    }

    // Filter: gte
    if (options.gte) {
      list = list.filter(item =>
        Object.entries(options.gte).every(([k, v]) => item[k] >= v)
      );
    }

    // Filter: lte
    if (options.lte) {
      list = list.filter(item =>
        Object.entries(options.lte).every(([k, v]) => item[k] <= v)
      );
    }

    // Sort
    if (options.order) {
      const col = options.order.column;
      const asc = options.order.ascending ?? true;
      list.sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    // Limit
    if (options.limit) list = list.slice(0, options.limit);

    return list;
  },

  // -------------------------------------------------------------------------
  // GENERIC INSERT
  // -------------------------------------------------------------------------
  async insert(table, records) {
    const list = Array.isArray(records) ? records : [records];
    const existing = await this._ensureLoaded(table);

    const created = list.map(item => ({
      ...item,
      id: item.id || this._genId(table),
      created_at: item.created_at || new Date().toISOString()
    }));

    const updated = [...created, ...existing];
    this._saveTable(table, updated);

    await this.recordAuditLog("INSERT", table, created[0]?.id, null, created[0]);
    return created;
  },

  // -------------------------------------------------------------------------
  // GENERIC UPDATE
  // -------------------------------------------------------------------------
  async update(table, id, values) {
    const existing = await this._ensureLoaded(table);
    let updated = null;

    const newList = existing.map(item => {
      if (String(item.id) === String(id)) {
        updated = { ...item, ...values, updated_at: new Date().toISOString() };
        return updated;
      }
      return item;
    });

    if (!updated) {
      throw new Error(`Record id="${id}" tidak ditemukan di tabel "${table}".`);
    }

    this._saveTable(table, newList);
    await this.recordAuditLog("UPDATE", table, id, null, values);
    return [updated];
  },

  // -------------------------------------------------------------------------
  // GENERIC DELETE
  // -------------------------------------------------------------------------
  async delete(table, id) {
    const existing = await this._ensureLoaded(table);
    const newList = existing.filter(item => String(item.id) !== String(id));
    this._saveTable(table, newList);
    await this.recordAuditLog("DELETE", table, id, null, null);
    return true;
  },

  // -------------------------------------------------------------------------
  // TEST CONNECTION (selalu sukses karena mode lokal)
  // -------------------------------------------------------------------------
  async testConnection() {
    return { success: true, message: "Mode JSON Lokal aktif. Data dibaca dari file JSON & localStorage." };
  }
};

window.SupabaseService = SupabaseService;
