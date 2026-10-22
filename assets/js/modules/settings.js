/**
 * Modul Pengaturan Aplikasi & Profil Klinik
 * Klinik Asy-Syifa Environmental Management System
 */

const SettingsModule = {
  async init() {
    this.loadClinicProfile();
    this.renderStorageStatus();
    await this.loadParametersSettings();
  },

  // 1. PROFIL KLINIK
  loadClinicProfile() {
    const form = document.getElementById("form-clinic-settings");
    if (!form) return;
    const c = window.APP_CONFIG.CLINIC;

    form.elements["nama_klinik"].value = c.nama || "";
    form.elements["nomor_izin"].value = c.nomor_izin || "";
    form.elements["alamat"].value = c.alamat || "";
    form.elements["telepon"].value = c.telepon || "";
    form.elements["email"].value = c.email || "";
    form.elements["kepala_klinik"].value = c.kepala_klinik || "";
    form.elements["penanggung_jawab_sanitarian"].value = c.penanggung_jawab_sanitarian || "";
    form.elements["nip_sanitarian"].value = c.nip_sanitarian || "";
  },

  saveClinicProfile(e) {
    e.preventDefault();
    const form = e.target;

    const newProfile = {
      nama: form.elements["nama_klinik"].value.trim(),
      nomor_izin: form.elements["nomor_izin"].value.trim(),
      alamat: form.elements["alamat"].value.trim(),
      telepon: form.elements["telepon"].value.trim(),
      email: form.elements["email"].value.trim(),
      kepala_klinik: form.elements["kepala_klinik"].value.trim(),
      penanggung_jawab_sanitarian: form.elements["penanggung_jawab_sanitarian"].value.trim(),
      nip_sanitarian: form.elements["nip_sanitarian"].value.trim()
    };

    window.APP_CONFIG.CLINIC = newProfile;
    localStorage.setItem("asyifa_clinic_profile", JSON.stringify(newProfile));
    Notify.success("Profil dan kop Klinik Asy-Syifa berhasil disimpan.");
  },

  // 2. STATUS PENYIMPANAN DATA
  renderStorageStatus() {
    const container = document.getElementById("storage-status-container");
    if (!container) return;

    // Hitung total record di localStorage
    const tables = [
      "rooms", "waste_types", "ipal_parameters", "transporters",
      "ipal_flow_records", "ipal_sampling_records", "ipal_maintenance_records",
      "waste_collections", "waste_collection_items",
      "tps_receipts", "tps_receipt_items",
      "waste_transports", "waste_transport_items",
      "tps_adjustments", "tps_inspections", "corrective_actions"
    ];

    const rows = tables.map(t => {
      const raw = localStorage.getItem(`asyifa_${t}`);
      const count = raw ? JSON.parse(raw).length : 0;
      return `
        <tr>
          <td><code>${t}</code></td>
          <td class="text-end"><span class="badge badge-soft-info">${count} record</span></td>
        </tr>
      `;
    }).join("");

    const seedVersion = localStorage.getItem("asyifa_seed_version") || "-";
    const usedKB = Math.round(JSON.stringify(localStorage).length / 1024);

    container.innerHTML = `
      <div class="alert alert-success py-2 mb-3 d-flex align-items-center gap-2">
        <i class="bi bi-hdd-fill fs-5"></i>
        <div>
          <strong>Mode Penyimpanan: JSON Lokal + localStorage</strong><br>
          <small>Seed versi <strong>${seedVersion}</strong> &nbsp;|&nbsp; Digunakan: <strong>~${usedKB} KB</strong></small>
        </div>
      </div>
      <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
        <table class="table table-sm table-custom">
          <thead><tr><th>Tabel Data</th><th class="text-end">Jumlah Data</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <button class="btn btn-sm btn-outline-danger mt-3" onclick="SettingsModule.confirmResetData()">
        <i class="bi bi-arrow-counterclockwise me-1"></i>Reset Semua Data ke Seed Awal
      </button>
    `;
  },

  async confirmResetData() {
    const ok = await Notify.confirm(
      "Seluruh data transaksi (pengumpulan, penerimaan, pengangkutan, IPAL, dll) akan dihapus dan dikembalikan ke data awal. Profil klinik tidak akan terhapus. Lanjutkan?",
      "Reset Data"
    );
    if (!ok) return;

    // Hapus semua tabel kecuali profil klinik
    const keys = Object.keys(localStorage).filter(k => k.startsWith("asyifa_") && k !== "asyifa_clinic_profile");
    keys.forEach(k => localStorage.removeItem(k));

    Notify.success("Data berhasil direset. Halaman akan dimuat ulang...");
    setTimeout(() => window.location.reload(), 1200);
  },

  // 3. PARAMETER BAKU MUTU IPAL
  async loadParametersSettings() {
    const tbody = document.getElementById("tbody-parameters-settings");
    if (!tbody) return;

    if (!IpalModule.parameters || !IpalModule.parameters.length) {
      await IpalModule.loadParameters();
    }

    const params = IpalModule.parameters;
    if (!params.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Belum ada parameter baku mutu.</td></tr>`;
      return;
    }

    tbody.innerHTML = params.map(p => `
      <tr>
        <td><strong>${p.nama_parameter}</strong></td>
        <td><code>${p.kode_parameter}</code></td>
        <td>${p.satuan}</td>
        <td class="text-end font-monospace">${p.range_min ? p.range_min + ' - ' : '<= '}${p.baku_mutu_outlet}</td>
        <td><small class="text-muted">${p.metode_uji || '-'}</small></td>
      </tr>
    `).join("");
  }
};

window.SettingsModule = SettingsModule;
