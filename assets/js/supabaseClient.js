/**
 * JsonService — Data Access Layer berbasis File JSON + localStorage
 * Sistem Informasi IPAL & Limbah B3 Klinik Asy-Syifa
 *
 * Arsitektur:
 *  - MASTER tables (rooms, waste_types, ipal_parameters, transporters):
 *      Seed dibaca dari /data/<table>.json setiap kali SEED_VERSION berubah.
 *      Perubahan user (insert/update/delete) disimpan ke localStorage.
 *      Jika SEED_VERSION sama dengan yang tersimpan, localStorage dipakai langsung.
 *
 *  - TRANSAKSI tables (collections, receipts, dll):
 *      Seed dibaca SEKALI dari JSON jika localStorage belum ada.
 *      Setelah itu semua operasi hanya ke localStorage — tidak pernah ditulis ulang dari JSON.
 *
 *  Dengan arsitektur ini:
 *      ✅ Data user tersimpan permanen di localStorage browser
 *      ✅ Update master data (dari deploy baru) otomatis teraplikasi saat SEED_VERSION naik
 *      ✅ Data transaksi user tidak pernah terhapus oleh deploy baru
 */

const SupabaseService = {
  isLive: false,
  currentUser: null,

  // Naikkan angka ini setiap kali ada perubahan pada file JSON master
  // agar browser mengambil seed terbaru dari file JSON
  SEED_VERSION: "3",

  // Tabel master — di-refresh dari JSON jika SEED_VERSION berubah
  MASTER_TABLES: ["rooms", "waste_types", "ipal_parameters", "transporters"],

  // Tabel transaksi — hanya seed sekali, tidak pernah di-overwrite dari JSON
  TRANSACTION_TABLES: [
    "ipal_flow_records", "ipal_sampling_records", "ipal_test_results",
    "ipal_maintenance_records", "waste_collections", "waste_collection_items",
    "tps_receipts", "tps_receipt_items", "waste_transports", "waste_transport_items",
    "tps_adjustments", "tps_inspections", "corrective_actions", "audit_logs"
  ],

  get ALL_TABLES() {
    return [...this.MASTER_TABLES, ...this.TRANSACTION_TABLES];
  },

  _cache: {},

  // -------------------------------------------------------------------------
  // INISIALISASI
  // -------------------------------------------------------------------------
  async init() {
    console.log("✅ JsonService aktif — Mode JSON Lokal + localStorage.");

    // Set default user
    const savedUser = localStorage.getItem("asyifa_mock_user");
    this.currentUser = savedUser ? JSON.parse(savedUser) : {
      id: "admin-asysyifa",
      email: "sanitarian@klinik-asysyifa.com",
      user_metadata: { full_name: "Siti Rahmawati, S.Tr.Kes (Sanitarian)", role: "admin" }
    };

    // Cek apakah perlu refresh seed master (versi baru)
    const storedVersion = localStorage.getItem("asyifa_seed_version");
    if (storedVersion !== this.SEED_VERSION) {
      console.log(`🔄 Seed versi baru (${this.SEED_VERSION}), memuat ulang master data dari JSON...`);
      await this._refreshMasterSeeds();
      localStorage.setItem("asyifa_seed_version", this.SEED_VERSION);
    }

    // Seed tabel transaksi jika belum pernah ada di localStorage
    await this._seedTransactionTablesOnce();
  },

  // Refresh tabel master dari file JSON (menggabungkan seed baru + data user)
  async _refreshMasterSeeds() {
    for (const table of this.MASTER_TABLES) {
      try {
        const res = await fetch(`data/${table}.json?v=${this.SEED_VERSION}`);
        if (!res.ok) continue;
        const seedData = await res.json();

        // Ambil data user yang sudah ada (untuk merge perubahan user)
        const key = `asyifa_${table}`;
        const existingRaw = localStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];

        // Merge: seed sebagai base, overwrite dengan data user jika id sama
        const seedMap = {};
        seedData.forEach(item => { seedMap[item.id] = item; });
        existing.forEach(item => { seedMap[item.id] = item; }); // user data menang

        const merged = Object.values(seedMap);
        // Tambahkan record user baru yang tidak ada di seed (id tidak dikenal)
        const seedIds = new Set(seedData.map(i => i.id));
        existing.forEach(item => {
          if (!seedIds.has(item.id)) merged.push(item);
        });

        this._cache[key] = merged;
        localStorage.setItem(key, JSON.stringify(merged));
        console.log(`  ✔ ${table}: ${merged.length} record (seed: ${seedData.length})`);
      } catch (err) {
        console.warn(`  ⚠ Gagal load seed ${table}:`, err.message);
      }
    }
  },

  // Seed tabel transaksi hanya sekali (jika localStorage belum ada)
  async _seedTransactionTablesOnce() {
    for (const table of this.TRANSACTION_TABLES) {
      const key = `asyifa_${table}`;
      if (localStorage.getItem(key) !== null) continue; // sudah ada, skip

      try {
        const res = await fetch(`data/${table}.json?v=${this.SEED_VERSION}`);
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem(key, JSON.stringify(data));
          this._cache[key] = data;
        } else {
          localStorage.setItem(key, JSON.stringify([]));
          this._cache[key] = [];
        }
      } catch {
        localStorage.setItem(key, JSON.stringify([]));
        this._cache[key] = [];
      }
    }
  },

  // -------------------------------------------------------------------------
  // INTERNAL: Ambil data tabel dari cache/localStorage
  // -------------------------------------------------------------------------
  async _ensureLoaded(table) {
    const key = `asyifa_${table}`;
    if (this._cache[key] !== undefined) return this._cache[key];

    const stored = localStorage.getItem(key);
    if (stored !== null) {
      try {
        this._cache[key] = JSON.parse(stored);
        return this._cache[key];
      } catch {
        // corrupt — reset
      }
    }

    // Fallback: fetch dari JSON (jarang terjadi setelah init())
    try {
      const res = await fetch(`data/${table}.json?v=${this.SEED_VERSION}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(key, JSON.stringify(data));
        this._cache[key] = data;
        return data;
      }
    } catch { /* noop */ }

    this._cache[key] = [];
    localStorage.setItem(key, JSON.stringify([]));
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
  // AUTHENTICATION
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
      action, entity,
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
  // STORAGE SIMULASI
  // -------------------------------------------------------------------------
  async uploadDocument(file, folder = "general") {
    if (!file) throw new Error("File tidak ditemukan.");
    const filePath = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    return { path: filePath, name: file.name, size: file.size, url: URL.createObjectURL(file) };
  },

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------
  async select(table, options = {}) {
    let list = [...(await this._ensureLoaded(table))];

    if (options.eq) {
      list = list.filter(item =>
        Object.entries(options.eq).every(([k, v]) => String(item[k]) === String(v))
      );
    }
    if (options.gte) {
      list = list.filter(item =>
        Object.entries(options.gte).every(([k, v]) => item[k] >= v)
      );
    }
    if (options.lte) {
      list = list.filter(item =>
        Object.entries(options.lte).every(([k, v]) => item[k] <= v)
      );
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
    if (options.limit) list = list.slice(0, options.limit);

    return list;
  },

  // -------------------------------------------------------------------------
  // INSERT
  // -------------------------------------------------------------------------
  async insert(table, records) {
    const list = Array.isArray(records) ? records : [records];
    const existing = await this._ensureLoaded(table);

    const created = list.map(item => ({
      ...item,
      id: item.id || this._genId(table),
      created_at: item.created_at || new Date().toISOString()
    }));

    // Baru masuk di awal agar tampil paling atas di tabel
    this._saveTable(table, [...created, ...existing]);
    await this.recordAuditLog("INSERT", table, created[0]?.id, null, created[0]);
    return created;
  },

  // -------------------------------------------------------------------------
  // UPDATE
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
  // DELETE
  // -------------------------------------------------------------------------
  async delete(table, id) {
    const existing = await this._ensureLoaded(table);
    const newList = existing.filter(item => String(item.id) !== String(id));
    this._saveTable(table, newList);
    await this.recordAuditLog("DELETE", table, id, null, null);
    return true;
  },

  // -------------------------------------------------------------------------
  // STATUS
  // -------------------------------------------------------------------------
  async testConnection() {
    const totalRecords = this.ALL_TABLES.reduce((acc, t) => {
      const key = `asyifa_${t}`;
      const d = localStorage.getItem(key);
      return acc + (d ? JSON.parse(d).length : 0);
    }, 0);
    return {
      success: true,
      message: `Mode JSON Lokal aktif. Seed v${this.SEED_VERSION}. Total ${totalRecords} record tersimpan di localStorage.`
    };
  }
};

window.SupabaseService = SupabaseService;
