/**
 * Master Data Module: Ruangan, Jenis Limbah B3, dan Perusahaan Pengangkut
 * Klinik Asy-Syifa Environmental Management System
 */

const MastersModule = {
  rooms: [],
  wasteTypes: [],
  transporters: [],

  async loadAll() {
    await Promise.all([
      this.loadRooms(),
      this.loadWasteTypes(),
      this.loadTransporters()
    ]);
  },

  // ==========================================================================
  // MASTER RUANGAN
  // ==========================================================================
  async loadRooms() {
    try {
      this.rooms = await SupabaseService.select("rooms", {
        order: { column: "kode_ruangan", ascending: true }
      });
      this.renderRoomsTable();
    } catch (err) {
      console.error("Gagal memuat master ruangan:", err);
    }
  },

  renderRoomsTable(searchTerm = "") {
    const tbody = document.getElementById("tbody-rooms");
    if (!tbody) return;

    let filtered = this.rooms;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.kode_ruangan.toLowerCase().includes(term) ||
        r.nama_ruangan.toLowerCase().includes(term) ||
        (r.penanggung_jawab && r.penanggung_jawab.toLowerCase().includes(term))
      );
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Belum ada data ruangan yang sesuai.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((r, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong class="text-primary">${r.kode_ruangan}</strong></td>
        <td><strong>${r.nama_ruangan}</strong></td>
        <td>${r.penanggung_jawab || "-"}</td>
        <td>${r.lokasi_gedung || "-"}</td>
        <td class="text-center">
          <span class="badge ${r.is_active ? 'badge-soft-success' : 'badge-soft-danger'}">
            ${r.is_active ? 'Aktif' : 'Non-Aktif'}
          </span>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="MastersModule.openRoomModal('${r.id}')" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-${r.is_active ? 'warning' : 'success'}" onclick="MastersModule.toggleRoomStatus('${r.id}', ${!r.is_active})" title="${r.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
            <i class="bi bi-power"></i>
          </button>
        </td>
      </tr>
    `).join("");
  },

  openRoomModal(id = null) {
    const modalEl = document.getElementById("modal-room");
    if (!modalEl) return;

    const titleEl = document.getElementById("modal-room-title");
    const form = document.getElementById("form-room");
    form.reset();

    if (id) {
      const item = this.rooms.find(r => String(r.id) === String(id));
      if (!item) return;
      titleEl.innerHTML = `<i class="bi bi-pencil me-2"></i>Edit Data Ruangan`;
      form.elements["id"].value = item.id;
      form.elements["kode_ruangan"].value = item.kode_ruangan;
      form.elements["nama_ruangan"].value = item.nama_ruangan;
      form.elements["penanggung_jawab"].value = item.penanggung_jawab || "";
      form.elements["lokasi_gedung"].value = item.lokasi_gedung || "";
      form.elements["keterangan"].value = item.keterangan || "";
      form.elements["is_active"].checked = !!item.is_active;
    } else {
      titleEl.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Tambah Ruangan Baru`;
      form.elements["id"].value = "";
      form.elements["is_active"].checked = true;
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  },

  async saveRoom(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements["id"].value;

    const data = {
      kode_ruangan: form.elements["kode_ruangan"].value.trim().toUpperCase(),
      nama_ruangan: form.elements["nama_ruangan"].value.trim(),
      penanggung_jawab: form.elements["penanggung_jawab"].value.trim(),
      lokasi_gedung: form.elements["lokasi_gedung"].value.trim(),
      keterangan: form.elements["keterangan"].value.trim(),
      is_active: form.elements["is_active"].checked
    };

    try {
      if (id) {
        await SupabaseService.update("rooms", id, data);
        Notify.success("Data ruangan berhasil diperbarui.");
      } else {
        await SupabaseService.insert("rooms", data);
        Notify.success("Ruangan baru berhasil ditambahkan.");
      }
      bootstrap.Modal.getInstance(document.getElementById("modal-room")).hide();
      await this.loadRooms();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan");
    }
  },

  async toggleRoomStatus(id, newStatus) {
    try {
      await SupabaseService.update("rooms", id, { is_active: newStatus });
      Notify.info(`Status ruangan berhasil diubah menjadi: ${newStatus ? 'Aktif' : 'Non-Aktif'}`);
      await this.loadRooms();
    } catch (err) {
      Notify.error(err.message, "Gagal Mengubah Status");
    }
  },

  // ==========================================================================
  // MASTER JENIS LIMBAH B3
  // ==========================================================================
  async loadWasteTypes() {
    try {
      this.wasteTypes = await SupabaseService.select("waste_types", {
        order: { column: "kode_limbah", ascending: true }
      });
      this.renderWasteTypesTable();
    } catch (err) {
      console.error("Gagal memuat master jenis limbah:", err);
    }
  },

  renderWasteTypesTable(searchTerm = "") {
    const tbody = document.getElementById("tbody-waste-types");
    if (!tbody) return;

    let filtered = this.wasteTypes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(w => 
        w.kode_limbah.toLowerCase().includes(term) ||
        w.nama_limbah.toLowerCase().includes(term) ||
        w.karakteristik.toLowerCase().includes(term)
      );
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada master jenis limbah.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((w, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><span class="badge bg-dark">${w.kode_limbah}</span></td>
        <td><strong>${w.nama_limbah}</strong></td>
        <td><span class="badge badge-soft-warning">${w.kategori}</span></td>
        <td><i class="bi bi-shield-exclamation text-danger me-1"></i>${w.karakteristik}</td>
        <td class="text-center"><strong>${w.satuan}</strong></td>
        <td class="text-center">${w.max_storage_days} Hari</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="MastersModule.openWasteTypeModal('${w.id}')" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-${w.is_active ? 'warning' : 'success'}" onclick="MastersModule.toggleWasteTypeStatus('${w.id}', ${!w.is_active})" title="${w.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
            <i class="bi bi-power"></i>
          </button>
        </td>
      </tr>
    `).join("");
  },

  openWasteTypeModal(id = null) {
    const modalEl = document.getElementById("modal-waste-type");
    if (!modalEl) return;

    const titleEl = document.getElementById("modal-waste-type-title");
    const form = document.getElementById("form-waste-type");
    form.reset();

    if (id) {
      const item = this.wasteTypes.find(w => String(w.id) === String(id));
      if (!item) return;
      titleEl.innerHTML = `<i class="bi bi-pencil me-2"></i>Edit Jenis Limbah B3`;
      form.elements["id"].value = item.id;
      form.elements["kode_limbah"].value = item.kode_limbah;
      form.elements["nama_limbah"].value = item.nama_limbah;
      form.elements["kategori"].value = item.kategori;
      form.elements["karakteristik"].value = item.karakteristik;
      form.elements["satuan"].value = item.satuan;
      form.elements["max_storage_days"].value = item.max_storage_days || 90;
      form.elements["petunjuk_penanganan"].value = item.petunjuk_penanganan || "";
      form.elements["is_active"].checked = !!item.is_active;
    } else {
      titleEl.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Tambah Jenis Limbah B3`;
      form.elements["id"].value = "";
      form.elements["max_storage_days"].value = 90;
      form.elements["is_active"].checked = true;
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  },

  async saveWasteType(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements["id"].value;

    const data = {
      kode_limbah: form.elements["kode_limbah"].value.trim(),
      nama_limbah: form.elements["nama_limbah"].value.trim(),
      kategori: form.elements["kategori"].value,
      karakteristik: form.elements["karakteristik"].value.trim(),
      satuan: form.elements["satuan"].value,
      max_storage_days: parseInt(form.elements["max_storage_days"].value) || 90,
      petunjuk_penanganan: form.elements["petunjuk_penanganan"].value.trim(),
      is_active: form.elements["is_active"].checked
    };

    try {
      if (id) {
        await SupabaseService.update("waste_types", id, data);
        Notify.success("Jenis limbah berhasil diperbarui.");
      } else {
        await SupabaseService.insert("waste_types", data);
        Notify.success("Jenis limbah baru berhasil ditambahkan.");
      }
      bootstrap.Modal.getInstance(document.getElementById("modal-waste-type")).hide();
      await this.loadWasteTypes();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan");
    }
  },

  async toggleWasteTypeStatus(id, newStatus) {
    try {
      await SupabaseService.update("waste_types", id, { is_active: newStatus });
      Notify.info(`Status jenis limbah berhasil diubah.`);
      await this.loadWasteTypes();
    } catch (err) {
      Notify.error(err.message, "Gagal Mengubah Status");
    }
  },

  // ==========================================================================
  // MASTER PENGANGKUT / TRANSPORTER
  // ==========================================================================
  async loadTransporters() {
    try {
      this.transporters = await SupabaseService.select("transporters", {
        order: { column: "nama_perusahaan", ascending: true }
      });
      this.renderTransportersTable();
    } catch (err) {
      console.error("Gagal memuat master pengangkut:", err);
    }
  },

  renderTransportersTable(searchTerm = "") {
    const tbody = document.getElementById("tbody-transporters");
    if (!tbody) return;

    let filtered = this.transporters;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.nama_perusahaan.toLowerCase().includes(term) ||
        t.no_izin_klhk.toLowerCase().includes(term) ||
        (t.no_kendaraan_default && t.no_kendaraan_default.toLowerCase().includes(term))
      );
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada master pengangkut.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map((t, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${t.nama_perusahaan}</strong></td>
        <td><small class="badge badge-soft-info">${t.no_izin_klhk}</small></td>
        <td>${Formatters.formatDateIndo(t.masa_berlaku_izin)}</td>
        <td>${t.telepon || "-"}</td>
        <td><span class="badge bg-secondary">${t.no_kendaraan_default || "-"}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="MastersModule.openTransporterModal('${t.id}')" title="Edit">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-${t.is_active ? 'warning' : 'success'}" onclick="MastersModule.toggleTransporterStatus('${t.id}', ${!t.is_active})" title="${t.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
            <i class="bi bi-power"></i>
          </button>
        </td>
      </tr>
    `).join("");
  },

  openTransporterModal(id = null) {
    const modalEl = document.getElementById("modal-transporter");
    if (!modalEl) return;

    const titleEl = document.getElementById("modal-transporter-title");
    const form = document.getElementById("form-transporter");
    form.reset();

    if (id) {
      const item = this.transporters.find(t => String(t.id) === String(id));
      if (!item) return;
      titleEl.innerHTML = `<i class="bi bi-pencil me-2"></i>Edit Data Transporter`;
      form.elements["id"].value = item.id;
      form.elements["nama_perusahaan"].value = item.nama_perusahaan;
      form.elements["no_izin_klhk"].value = item.no_izin_klhk;
      form.elements["masa_berlaku_izin"].value = item.masa_berlaku_izin;
      form.elements["kontak_person"].value = item.kontak_person || "";
      form.elements["telepon"].value = item.telepon || "";
      form.elements["alamat"].value = item.alamat || "";
      form.elements["no_kendaraan_default"].value = item.no_kendaraan_default || "";
      form.elements["is_active"].checked = !!item.is_active;
    } else {
      titleEl.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Tambah Transporter Baru`;
      form.elements["id"].value = "";
      form.elements["is_active"].checked = true;
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  },

  async saveTransporter(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.elements["id"].value;

    const data = {
      nama_perusahaan: form.elements["nama_perusahaan"].value.trim(),
      no_izin_klhk: form.elements["no_izin_klhk"].value.trim(),
      masa_berlaku_izin: form.elements["masa_berlaku_izin"].value,
      kontak_person: form.elements["kontak_person"].value.trim(),
      telepon: form.elements["telepon"].value.trim(),
      alamat: form.elements["alamat"].value.trim(),
      no_kendaraan_default: form.elements["no_kendaraan_default"].value.trim(),
      is_active: form.elements["is_active"].checked
    };

    try {
      if (id) {
        await SupabaseService.update("transporters", id, data);
        Notify.success("Data pengangkut berhasil diperbarui.");
      } else {
        await SupabaseService.insert("transporters", data);
        Notify.success("Pengangkut baru berhasil ditambahkan.");
      }
      bootstrap.Modal.getInstance(document.getElementById("modal-transporter")).hide();
      await this.loadTransporters();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan");
    }
  },

  async toggleTransporterStatus(id, newStatus) {
    try {
      await SupabaseService.update("transporters", id, { is_active: newStatus });
      Notify.info("Status pengangkut berhasil diubah.");
      await this.loadTransporters();
    } catch (err) {
      Notify.error(err.message, "Gagal Mengubah Status");
    }
  }
};

window.MastersModule = MastersModule;
