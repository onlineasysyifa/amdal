/**
 * Modul Pengaturan Aplikasi & Profil Klinik
 * Klinik Asy-Syifa Environmental Management System
 */

const SettingsModule = {
  async init() {
    this.loadClinicProfile();
    this.renderConnectionStatus();
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
  renderConnectionStatus() {
    const statusBadge = document.getElementById("supabase-connection-status");
    if (statusBadge) {
      statusBadge.innerHTML = `<span class="badge bg-success"><i class="bi bi-hdd me-1"></i>Mode JSON Lokal — Data tersimpan di browser (localStorage)</span>`;
    }

    // Sembunyikan form konfigurasi Supabase jika masih ada di HTML
    const supabaseConfigCard = document.getElementById("card-supabase-config");
    if (supabaseConfigCard) supabaseConfigCard.classList.add("d-none");
  },

  async testSupabaseConnection() {
    const res = await SupabaseService.testConnection();
    Notify.success(res.message, "Status Penyimpanan Data");
  },

  // 3. PARAMETER BAKU MUTU IPAL
  async loadParametersSettings() {
    const tbody = document.getElementById("tbody-parameters-settings");
    if (!tbody) return;

    // Pastikan IpalModule sudah punya parameters
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
