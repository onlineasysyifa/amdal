/**
 * Modul Pengaturan Aplikasi, Profil Klinik & Konfigurasi Supabase
 * Klinik Asy-Syifa Environmental Management System
 */

const SettingsModule = {
  async init() {
    this.loadClinicProfile();
    this.loadSupabaseConfigForm();
    await this.loadParametersSettings();
  },

  // 1. PROFIL KLINIK ASY-SYIFA
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

    // Update in Supabase application_settings if connected
    if (SupabaseService.isLive) {
      SupabaseService.update("application_settings", "clinic_profile", { value: newProfile }).catch(err => {
        console.warn("Gagal update setting ke Supabase:", err);
      });
    }

    Notify.success("Profil dan kop Klinik Asy-Syifa berhasil disimpan.");
  },

  // 2. KONFIGURASI KONEKSI SUPABASE
  loadSupabaseConfigForm() {
    const urlInput = document.getElementById("cfg-supabase-url");
    const keyInput = document.getElementById("cfg-supabase-key");
    const statusBadge = document.getElementById("supabase-connection-status");

    if (urlInput) urlInput.value = window.APP_CONFIG.SUPABASE_URL || "";
    if (keyInput) keyInput.value = window.APP_CONFIG.SUPABASE_ANON_KEY || "";

    if (statusBadge) {
      if (SupabaseService.isLive) {
        statusBadge.innerHTML = `<span class="badge bg-success"><i class="bi bi-cloud-check me-1"></i>Terhubung (Supabase Live)</span>`;
      } else {
        statusBadge.innerHTML = `<span class="badge bg-warning text-dark"><i class="bi bi-hdd-network me-1"></i>Mode Lokal Demo</span>`;
      }
    }
  },

  async testSupabaseConnection() {
    const btn = document.getElementById("btn-test-connection");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Menguji...`;
    }

    const res = await SupabaseService.testConnection();
    if (res.success) {
      Notify.success(res.message, "Uji Koneksi Berhasil");
    } else {
      Notify.error(res.message, "Uji Koneksi Gagal");
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i>Uji Koneksi`;
    }
  },

  saveSupabaseConfig(e) {
    e.preventDefault();
    const url = document.getElementById("cfg-supabase-url").value.trim();
    const key = document.getElementById("cfg-supabase-key").value.trim();

    if (!url || !key) {
      Notify.warning("Masukkan Supabase Project URL dan Anon Key!");
      return;
    }

    localStorage.setItem("asyifa_supabase_url", url);
    localStorage.setItem("asyifa_supabase_anon_key", key);

    Notify.success("Pengaturan Supabase disimpan. Halaman akan dimuat ulang untuk menghubungkan.", "Konfigurasi Disimpan");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  },

  resetSupabaseConfig() {
    localStorage.removeItem("asyifa_supabase_url");
    localStorage.removeItem("asyifa_supabase_anon_key");
    Notify.info("Konfigurasi dikembalikan ke default. Memuat ulang halaman...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },

  // 3. PARAMETER BAKU MUTU IPAL
  async loadParametersSettings() {
    const tbody = document.getElementById("tbody-parameters-settings");
    if (!tbody) return;

    const params = IpalModule.parameters;
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
