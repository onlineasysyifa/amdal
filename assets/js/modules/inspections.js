/**
 * Modul Pemeriksaan Sarana TPS & Tindak Lanjut Korektif
 * Klinik Asy-Syifa Environmental Management System
 */

const InspectionsModule = {
  inspections: [],
  correctiveActions: [],

  async init() {
    await Promise.all([
      this.loadInspections(),
      this.loadCorrectiveActions()
    ]);
  },

  // ==========================================================================
  // 1. INSPEKSI TPS
  // ==========================================================================
  async loadInspections() {
    try {
      this.inspections = await SupabaseService.select("tps_inspections", {
        order: { column: "tanggal", ascending: false }
      });
      this.renderInspectionsTable();
    } catch (err) {
      console.error("Gagal memuat inspeksi TPS:", err);
    }
  },

  renderInspectionsTable() {
    const tbody = document.getElementById("tbody-tps-inspections");
    if (!tbody) return;

    if (!this.inspections.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada catatan inspeksi sarana TPS.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.inspections.map((ins, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${Formatters.formatDateIndo(ins.tanggal)}</strong> <small class="text-muted">${Formatters.formatTime(ins.waktu)}</small></td>
        <td>${ins.petugas}</td>
        <td class="text-center">${ins.suhu_ruangan ? ins.suhu_ruangan + ' °C' : '-'}</td>
        <td>Kebersihan: <strong>${ins.kebersihan}</strong> | Ventilasi: <strong>${ins.ventilasi}</strong></td>
        <td>
          <span class="badge ${ins.spillage_kit ? 'badge-soft-success' : 'badge-soft-danger'} me-1">Spill Kit</span>
          <span class="badge ${ins.apar ? 'badge-soft-success' : 'badge-soft-danger'} me-1">APAR</span>
          <span class="badge ${ins.simbol_label ? 'badge-soft-success' : 'badge-soft-danger'}">Simbol/Label</span>
        </td>
        <td class="text-center">${Formatters.renderStatusBadge(ins.status_kelayakan)}</td>
        <td><small>${ins.catatan || '-'}</small></td>
      </tr>
    `).join("");
  },

  openInspectionModal() {
    const modalEl = document.getElementById("modal-tps-inspection");
    if (!modalEl) return;
    const form = document.getElementById("form-tps-inspection");
    form.reset();

    form.elements["tanggal"].value = new Date().toISOString().slice(0, 10);
    form.elements["waktu"].value = new Date().toTimeString().slice(0, 5);
    form.elements["petugas"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;

    new bootstrap.Modal(modalEl).show();
  },

  async saveInspection(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      tanggal: form.elements["tanggal"].value,
      waktu: form.elements["waktu"].value,
      petugas: form.elements["petugas"].value.trim(),
      suhu_ruangan: parseFloat(form.elements["suhu_ruangan"].value) || null,
      kebersihan: form.elements["kebersihan"].value,
      ventilasi: form.elements["ventilasi"].value,
      spillage_kit: form.elements["spillage_kit"].checked,
      apar: form.elements["apar"].checked,
      simbol_label: form.elements["simbol_label"].checked,
      pencahayaan: form.elements["pencahayaan"].value,
      status_kelayakan: form.elements["status_kelayakan"].value,
      catatan: form.elements["catatan"].value.trim()
    };

    try {
      await SupabaseService.insert("tps_inspections", data);
      Notify.success("Hasil inspeksi sarana TPS berhasil dicatat.");
      bootstrap.Modal.getInstance(document.getElementById("modal-tps-inspection")).hide();
      await this.loadInspections();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan Inspeksi");
    }
  },

  // ==========================================================================
  // 2. TINDAK LANJUT KOREKTIF (Corrective Actions)
  // ==========================================================================
  async loadCorrectiveActions() {
    try {
      this.correctiveActions = await SupabaseService.select("corrective_actions", {
        order: { column: "tanggal_temuan", ascending: false }
      });
      this.renderCorrectiveTable();
    } catch (err) {
      console.error("Gagal memuat tindakan korektif:", err);
    }
  },

  renderCorrectiveTable() {
    const tbody = document.getElementById("tbody-corrective-actions");
    if (!tbody) return;

    if (!this.correctiveActions.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada temuan atau tindakan korektif aktif.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.correctiveActions.map((ca, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>
          <span class="badge ${ca.sumber_masalah === 'IPAL' ? 'badge-soft-info' : 'badge-soft-warning'}">
            ${ca.sumber_masalah}
          </span>
        </td>
        <td><strong>${Formatters.formatDateIndo(ca.tanggal_temuan)}</strong></td>
        <td><strong>${ca.deskripsi_temuan}</strong><br><small class="text-muted">Solusi: ${ca.tindakan_korektif}</small></td>
        <td>${ca.penanggung_jawab}</td>
        <td>${Formatters.formatDateIndo(ca.batas_waktu)}</td>
        <td class="text-center">${Formatters.renderStatusBadge(ca.status)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="InspectionsModule.openCorrectiveModal('${ca.id}')" title="Edit / Update Status">
            <i class="bi bi-pencil"></i>
          </button>
        </td>
      </tr>
    `).join("");
  },

  openCorrectiveModal(id = null) {
    const modalEl = document.getElementById("modal-corrective-action");
    if (!modalEl) return;
    const form = document.getElementById("form-corrective-action");
    form.reset();

    const titleEl = document.getElementById("modal-corrective-title");

    if (id) {
      const item = this.correctiveActions.find(c => String(c.id) === String(id));
      if (!item) return;
      titleEl.innerHTML = `<i class="bi bi-pencil me-2"></i>Update Tindakan Korektif`;
      form.elements["id"].value = item.id;
      form.elements["sumber_masalah"].value = item.sumber_masalah;
      form.elements["tanggal_temuan"].value = item.tanggal_temuan;
      form.elements["deskripsi_temuan"].value = item.deskripsi_temuan;
      form.elements["tindakan_korektif"].value = item.tindakan_korektif;
      form.elements["penanggung_jawab"].value = item.penanggung_jawab;
      form.elements["batas_waktu"].value = item.batas_waktu;
      form.elements["status"].value = item.status;
      form.elements["catatan_verifikasi"].value = item.catatan_verifikasi || "";
    } else {
      titleEl.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Catat Temuan & Tindakan Korektif`;
      form.elements["id"].value = "";
      form.elements["tanggal_temuan"].value = new Date().toISOString().slice(0, 10);
      form.elements["status"].value = "open";
      form.elements["penanggung_jawab"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;
    }

    new bootstrap.Modal(modalEl).show();
  },

  async saveCorrectiveAction(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements["id"].value;

    const data = {
      sumber_masalah: form.elements["sumber_masalah"].value,
      tanggal_temuan: form.elements["tanggal_temuan"].value,
      deskripsi_temuan: form.elements["deskripsi_temuan"].value.trim(),
      tindakan_korektif: form.elements["tindakan_korektif"].value.trim(),
      penanggung_jawab: form.elements["penanggung_jawab"].value.trim(),
      batas_waktu: form.elements["batas_waktu"].value,
      status: form.elements["status"].value,
      catatan_verifikasi: form.elements["catatan_verifikasi"].value.trim()
    };

    if (data.status === "resolved") {
      data.tanggal_selesai = new Date().toISOString().slice(0, 10);
    }

    try {
      if (id) {
        await SupabaseService.update("corrective_actions", id, data);
        Notify.success("Tindakan korektif berhasil diperbarui.");
      } else {
        await SupabaseService.insert("corrective_actions", data);
        Notify.success("Temuan & tindakan korektif baru berhasil disimpan.");
      }
      bootstrap.Modal.getInstance(document.getElementById("modal-corrective-action")).hide();
      await this.loadCorrectiveActions();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan");
    }
  }
};

window.InspectionsModule = InspectionsModule;
