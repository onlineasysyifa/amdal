/**
 * Modul Pengelolaan Limbah B3 (Pengumpulan, Penerimaan TPS, Stok Multi-Satuan, Pengangkutan)
 * Klinik Asy-Syifa Environmental Management System
 */

const WasteModule = {
  collections: [],
  collectionItems: [],
  receipts: [],
  receiptItems: [],
  transports: [],
  transportItems: [],
  adjustments: [],
  calculatedStock: [],

  async init() {
    await MastersModule.loadAll();
    await Promise.all([
      this.loadCollections(),
      this.loadReceipts(),
      this.loadTransports(),
      this.loadAdjustments()
    ]);
    this.calculateStock();
    this.renderStockCards();
    this.renderStockLedger();
  },

  // ==========================================================================
  // 1. PENGUMPULAN DARI RUANGAN
  // ==========================================================================
  async loadCollections() {
    try {
      this.collections = await SupabaseService.select("waste_collections", {
        order: { column: "tanggal", ascending: false }
      });
      this.collectionItems = await SupabaseService.select("waste_collection_items");
      this.renderCollectionsTable();
    } catch (err) {
      console.error("Gagal memuat pengumpulan limbah:", err);
    }
  },

  renderCollectionsTable() {
    const tbody = document.getElementById("tbody-waste-collections");
    if (!tbody) return;

    if (!this.collections.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada transaksi pengumpulan limbah dari ruangan.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.collections.map((c, idx) => {
      const room = MastersModule.rooms.find(r => r.id === c.room_id) || { nama_ruangan: "Ruangan", kode_ruangan: "-" };
      const items = this.collectionItems.filter(ci => ci.collection_id === c.id);
      const itemsSummary = items.map(i => {
        const wt = MastersModule.wasteTypes.find(w => w.id === i.waste_type_id) || { nama_limbah: "Limbah" };
        return `<div><small>• ${wt.nama_limbah}: <strong>${Formatters.formatQtyWithUnit(i.jumlah, i.satuan)}</strong></small></div>`;
      }).join("");

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            <strong class="text-primary">${c.no_transaksi}</strong><br>
            <small class="text-muted">${Formatters.formatDateIndo(c.tanggal)} ${Formatters.formatTime(c.waktu)}</small>
          </td>
          <td>
            <strong>${room.nama_ruangan}</strong><br>
            <small class="badge badge-soft-secondary">${room.kode_ruangan}</small>
          </td>
          <td>${itemsSummary || "-"}</td>
          <td>
            <small>Diambil: <strong>${c.petugas_pengambil}</strong></small><br>
            <small class="text-muted">Diserahkan: ${c.petugas_penyerah}</small>
          </td>
          <td class="text-center">${Formatters.renderStatusBadge(c.status)}</td>
          <td class="text-end">
            ${c.status === 'pending_tps' ? `
              <button class="btn btn-sm btn-primary me-1" onclick="WasteModule.openReceiveModal('${c.id}')" title="Terima Fisik di TPS">
                <i class="bi bi-box-arrow-in-down me-1"></i>Terima di TPS
              </button>
            ` : `
              <button class="btn btn-sm btn-outline-secondary" onclick="WasteModule.viewCollectionDetails('${c.id}')" title="Rincian">
                <i class="bi bi-eye"></i>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join("");
  },

  openCollectionModal() {
    const modalEl = document.getElementById("modal-waste-collection");
    if (!modalEl) return;
    const form = document.getElementById("form-waste-collection");
    form.reset();

    const todayStr = new Date().toISOString().slice(0, 10);
    form.elements["tanggal"].value = todayStr;
    form.elements["waktu"].value = new Date().toTimeString().slice(0, 5);
    form.elements["no_transaksi"].value = `TRX-${todayStr.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    form.elements["petugas_pengambil"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;

    // Populate Room Select
    const roomSelect = form.elements["room_id"];
    roomSelect.innerHTML = `<option value="">-- Pilih Ruangan Asal --</option>` + 
      MastersModule.rooms.filter(r => r.is_active).map(r => `
        <option value="${r.id}">${r.kode_ruangan} - ${r.nama_ruangan}</option>
      `).join("");

    // Reset multi-item container
    const itemsContainer = document.getElementById("collection-items-container");
    itemsContainer.innerHTML = "";
    this.addCollectionItemRow();

    new bootstrap.Modal(modalEl).show();
  },

  addCollectionItemRow() {
    const container = document.getElementById("collection-items-container");
    if (!container) return;
    const rowId = "item-row-" + Date.now() + Math.random().toString(36).substr(2, 4);

    const wasteOptions = MastersModule.wasteTypes.filter(w => w.is_active).map(w => `
      <option value="${w.id}" data-satuan="${w.satuan}">${w.kode_limbah} - ${w.nama_limbah} (${w.satuan})</option>
    `).join("");

    const rowHtml = `
      <div class="row g-2 align-items-center mb-2 p-2 border rounded bg-light item-entry-row" id="${rowId}">
        <div class="col-md-5">
          <label class="form-label small mb-1">Jenis Limbah B3</label>
          <select class="form-select form-select-sm sel-waste-type" required onchange="WasteModule.onItemWasteTypeChanged(this, '${rowId}')">
            <option value="">-- Pilih Jenis Limbah --</option>
            ${wasteOptions}
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">Jumlah</label>
          <input type="number" step="0.01" min="0.01" class="form-control form-select-sm inp-qty" required placeholder="0.00">
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">Satuan</label>
          <input type="text" class="form-control form-select-sm inp-satuan bg-white" readonly value="kg">
        </div>
        <div class="col-md-1 text-end pt-3">
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="document.getElementById('${rowId}').remove()" title="Hapus baris">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", rowHtml);
  },

  onItemWasteTypeChanged(selectEl, rowId) {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const unit = selectedOption.getAttribute("data-satuan") || "kg";
    const row = document.getElementById(rowId);
    if (row) {
      row.querySelector(".inp-satuan").value = unit;
    }
  },

  async saveCollection(e) {
    e.preventDefault();
    const form = e.target;
    const itemRows = document.querySelectorAll(".item-entry-row");

    if (!itemRows.length) {
      Notify.warning("Tambahkan minimal satu jenis limbah pada transaksi!");
      return;
    }

    const roomId = form.elements["room_id"].value;
    if (!roomId) {
      Notify.warning("Pilih ruangan asal limbah!");
      return;
    }

    const collectionData = {
      no_transaksi: form.elements["no_transaksi"].value.trim(),
      tanggal: form.elements["tanggal"].value,
      waktu: form.elements["waktu"].value,
      room_id: roomId,
      petugas_pengambil: form.elements["petugas_pengambil"].value.trim(),
      petugas_penyerah: form.elements["petugas_penyerah"].value.trim(),
      kondisi_kemasan: form.elements["kondisi_kemasan"].value.trim(),
      label_sesuai: form.elements["label_sesuai"].checked,
      catatan: form.elements["catatan"].value.trim(),
      status: "pending_tps"
    };

    const itemsToInsert = [];
    let valid = true;

    itemRows.forEach(row => {
      const wasteTypeId = row.querySelector(".sel-waste-type").value;
      const qty = parseFloat(row.querySelector(".inp-qty").value);
      const unit = row.querySelector(".inp-satuan").value;

      if (!wasteTypeId || isNaN(qty) || qty <= 0) {
        valid = false;
        return;
      }

      itemsToInsert.push({
        waste_type_id: wasteTypeId,
        jumlah: qty,
        satuan: unit,
        jumlah_diterima_tps: 0
      });
    });

    if (!valid || !itemsToInsert.length) {
      Notify.warning("Lengkapi data seluruh baris jenis limbah dan jumlah yang valid!");
      return;
    }

    try {
      const inserted = await SupabaseService.insert("waste_collections", collectionData);
      const collectionId = inserted[0].id;

      itemsToInsert.forEach(item => { item.collection_id = collectionId; });
      await SupabaseService.insert("waste_collection_items", itemsToInsert);

      Notify.success("Pengumpulan limbah berhasil dicatat. Status: Menunggu Penerimaan di TPS.");
      bootstrap.Modal.getInstance(document.getElementById("modal-waste-collection")).hide();
      await this.loadCollections();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan Transaksi");
    }
  },

  // ==========================================================================
  // 2. PENERIMAAN FISIK DI TPS
  // ==========================================================================
  async loadReceipts() {
    try {
      this.receipts = await SupabaseService.select("tps_receipts", {
        order: { column: "tanggal_terima", ascending: false }
      });
      this.receiptItems = await SupabaseService.select("tps_receipt_items");
      this.renderReceiptsTable();
    } catch (err) {
      console.error("Gagal memuat penerimaan TPS:", err);
    }
  },

  renderReceiptsTable() {
    const tbody = document.getElementById("tbody-tps-receipts");
    if (!tbody) return;

    if (!this.receipts.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada penerimaan fisik limbah di TPS.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.receipts.map((r, idx) => {
      const items = this.receiptItems.filter(ri => ri.receipt_id === r.id);
      const itemsDesc = items.map(i => {
        const wt = MastersModule.wasteTypes.find(w => w.id === i.waste_type_id) || { nama_limbah: "Limbah" };
        return `<div><small>• ${wt.nama_limbah}: <strong>${Formatters.formatQtyWithUnit(i.jumlah_diterima, i.satuan)}</strong></small></div>`;
      }).join("");

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong class="text-success">${r.no_penerimaan}</strong></td>
          <td>${Formatters.formatDateIndo(r.tanggal_terima)} <small class="text-muted">${Formatters.formatTime(r.waktu_terima)}</small></td>
          <td>${itemsDesc || "-"}</td>
          <td>${r.petugas_tps}</td>
          <td>${r.catatan || "-"}</td>
          <td class="text-center">${Formatters.renderStatusBadge(r.status)}</td>
        </tr>
      `;
    }).join("");
  },

  openReceiveModal(collectionId) {
    const col = this.collections.find(c => String(c.id) === String(collectionId));
    if (!col) return;

    const modalEl = document.getElementById("modal-tps-receive");
    if (!modalEl) return;
    const form = document.getElementById("form-tps-receive");
    form.reset();

    const todayStr = new Date().toISOString().slice(0, 10);
    form.elements["tanggal_terima"].value = todayStr;
    form.elements["waktu_terima"].value = new Date().toTimeString().slice(0, 5);
    form.elements["no_penerimaan"].value = `RCV-${todayStr.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    form.elements["collection_id"].value = col.id;
    form.elements["petugas_tps"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;

    const room = MastersModule.rooms.find(r => r.id === col.room_id) || { nama_ruangan: "-" };
    document.getElementById("receive-ref-info").innerHTML = `
      <strong>No. Transaksi:</strong> ${col.no_transaksi} | <strong>Ruangan:</strong> ${room.nama_ruangan} | <strong>Pengambil:</strong> ${col.petugas_pengambil}
    `;

    const items = this.collectionItems.filter(ci => ci.collection_id === col.id);
    const tbody = document.getElementById("tbody-receive-items");
    tbody.innerHTML = items.map(item => {
      const wt = MastersModule.wasteTypes.find(w => w.id === item.waste_type_id) || { nama_limbah: "Limbah" };
      const sisaDiterima = item.jumlah - (item.jumlah_diterima_tps || 0);

      return `
        <tr class="receive-item-row" data-collection-item-id="${item.id}" data-waste-type-id="${item.waste_type_id}" data-satuan="${item.satuan}">
          <td><strong>${wt.nama_limbah}</strong></td>
          <td class="text-end">${Formatters.formatQtyWithUnit(item.jumlah, item.satuan)}</td>
          <td class="text-end">
            <input type="number" step="0.01" max="${sisaDiterima}" min="0.01" class="form-control form-control-sm text-end inp-receive-qty" value="${sisaDiterima}" required>
          </td>
          <td>${item.satuan}</td>
        </tr>
      `;
    }).join("");

    new bootstrap.Modal(modalEl).show();
  },

  async saveTpsReceipt(e) {
    e.preventDefault();
    const form = e.target;
    const colId = form.elements["collection_id"].value;
    const rows = document.querySelectorAll(".receive-item-row");

    const receiptData = {
      no_penerimaan: form.elements["no_penerimaan"].value.trim(),
      tanggal_terima: form.elements["tanggal_terima"].value,
      waktu_terima: form.elements["waktu_terima"].value,
      collection_id: colId,
      petugas_tps: form.elements["petugas_tps"].value.trim(),
      kondisi_kemasan_tps: form.elements["kondisi_kemasan_tps"].value.trim(),
      catatan: form.elements["catatan"].value.trim(),
      status: "confirmed"
    };

    const itemsToInsert = [];
    rows.forEach(r => {
      const colItemId = r.dataset.collectionItemId;
      const wasteTypeId = r.dataset.wasteTypeId;
      const unit = r.dataset.satuan;
      const qty = parseFloat(r.querySelector(".inp-receive-qty").value);

      if (!isNaN(qty) && qty > 0) {
        itemsToInsert.push({
          collection_item_id: colItemId,
          waste_type_id: wasteTypeId,
          jumlah_diterima: qty,
          satuan: unit,
          kondisi_kemasan: "Baik"
        });
      }
    });

    if (!itemsToInsert.length) {
      Notify.warning("Jumlah diterima harus lebih dari 0!");
      return;
    }

    try {
      // Insert receipt record
      const inserted = await SupabaseService.insert("tps_receipts", receiptData);
      const receiptId = inserted[0].id;

      itemsToInsert.forEach(i => { i.receipt_id = receiptId; });
      await SupabaseService.insert("tps_receipt_items", itemsToInsert);

      // Update received quantity on collection items
      for (const item of itemsToInsert) {
        const colItem = this.collectionItems.find(ci => ci.id === item.collection_item_id);
        if (colItem) {
          const newReceived = (colItem.jumlah_diterima_tps || 0) + item.jumlah_diterima;
          await SupabaseService.update("waste_collection_items", colItem.id, { jumlah_diterima_tps: newReceived });
        }
      }

      // Check if collection is fully received or partial
      await this.loadCollections();
      const updatedItems = this.collectionItems.filter(ci => ci.collection_id === colId);
      const allDone = updatedItems.every(ci => ci.jumlah_diterima_tps >= ci.jumlah);
      const statusCollection = allDone ? "diterima_penuh" : "diterima_sebagian";
      await SupabaseService.update("waste_collections", colId, { status: statusCollection });

      Notify.success("Limbah berhasil diterima di TPS dan saldo stok telah diperbarui.");
      bootstrap.Modal.getInstance(document.getElementById("modal-tps-receive")).hide();

      await Promise.all([
        this.loadCollections(),
        this.loadReceipts()
      ]);
      this.calculateStock();
      this.renderStockCards();
      this.renderStockLedger();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Mengonfirmasi Penerimaan");
    }
  },

  // ==========================================================================
  // 3. STOK TPS, KARTU STOK & MASA SIMPAN
  // ==========================================================================
  async loadAdjustments() {
    try {
      this.adjustments = await SupabaseService.select("tps_adjustments", {
        order: { column: "tanggal", ascending: false }
      });
    } catch (err) {
      console.warn("Gagal memuat penyesuaian stok:", err);
    }
  },

  calculateStock() {
    const stockMap = {};

    // 1. Add confirmed receipts
    this.receiptItems.forEach(ri => {
      const receipt = this.receipts.find(r => r.id === ri.receipt_id);
      if (receipt && receipt.status === "confirmed") {
        const key = `${ri.waste_type_id}__${ri.satuan}`;
        if (!stockMap[key]) {
          stockMap[key] = {
            waste_type_id: ri.waste_type_id,
            satuan: ri.satuan,
            masuk: 0,
            keluar: 0,
            adjust_tambah: 0,
            adjust_kurang: 0,
            first_receipt: receipt.tanggal_terima
          };
        }
        stockMap[key].masuk += Number(ri.jumlah_diterima);
        if (!stockMap[key].first_receipt || receipt.tanggal_terima < stockMap[key].first_receipt) {
          stockMap[key].first_receipt = receipt.tanggal_terima;
        }
      }
    });

    // 2. Subtract confirmed transports
    this.transportItems.forEach(ti => {
      const transport = this.transports.find(t => t.id === ti.transport_id);
      if (transport && transport.status_pengangkutan === "confirmed") {
        const key = `${ti.waste_type_id}__${ti.satuan}`;
        if (!stockMap[key]) {
          stockMap[key] = {
            waste_type_id: ti.waste_type_id,
            satuan: ti.satuan,
            masuk: 0,
            keluar: 0,
            adjust_tambah: 0,
            adjust_kurang: 0,
            first_receipt: null
          };
        }
        stockMap[key].keluar += Number(ti.jumlah_angkut);
      }
    });

    // 3. Apply adjustments
    this.adjustments.forEach(adj => {
      const key = `${adj.waste_type_id}__${adj.satuan}`;
      if (!stockMap[key]) {
        stockMap[key] = {
          waste_type_id: adj.waste_type_id,
          satuan: adj.satuan,
          masuk: 0,
          keluar: 0,
          adjust_tambah: 0,
          adjust_kurang: 0,
          first_receipt: null
        };
      }
      if (adj.tipe_penyesuaian === "tambah") {
        stockMap[key].adjust_tambah += Number(adj.jumlah);
      } else {
        stockMap[key].adjust_kurang += Number(adj.jumlah);
      }
    });

    // Convert map to array and compute final saldo & days
    const today = new Date();
    this.calculatedStock = Object.values(stockMap).map(item => {
      const wt = MastersModule.wasteTypes.find(w => w.id === item.waste_type_id) || {
        kode_limbah: "-", nama_limbah: "Limbah", max_storage_days: 90, kategori: "-"
      };
      const saldo = (item.masuk + item.adjust_tambah) - (item.keluar + item.adjust_kurang);

      let days = 0;
      if (saldo > 0 && item.first_receipt) {
        const diffMs = today - new Date(item.first_receipt);
        days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      return {
        ...item,
        kode_limbah: wt.kode_limbah,
        nama_limbah: wt.nama_limbah,
        max_storage_days: wt.max_storage_days || 90,
        kategori: wt.kategori,
        saldo_akhir: Number(saldo.toFixed(2)),
        days_in_storage: days
      };
    });
  },

  renderStockCards() {
    const container = document.getElementById("tps-stock-cards-container");
    if (!container) return;

    if (!this.calculatedStock.length) {
      container.innerHTML = `
        <div class="col-12 text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1 d-block mb-2"></i>
          Belum ada saldo stok limbah B3 di TPS.
        </div>
      `;
      return;
    }

    container.innerHTML = this.calculatedStock.map(stock => {
      return `
        <div class="col-md-6 col-lg-4 mb-3">
          <div class="card metric-card h-100 border">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="badge bg-dark">${stock.kode_limbah}</span>
                ${Formatters.renderStorageAgeBadge(stock.days_in_storage, stock.max_storage_days)}
              </div>
              <h6 class="card-title fw-bold text-truncate mb-3" title="${stock.nama_limbah}">${stock.nama_limbah}</h6>
              <div class="d-flex align-items-baseline justify-content-between">
                <div>
                  <div class="text-muted small">Saldo Tersedia di TPS:</div>
                  <div class="fs-4 fw-bold text-primary">${Formatters.formatNumber(stock.saldo_akhir)} <span class="fs-6">${stock.satuan}</span></div>
                </div>
                <div class="text-end small text-muted">
                  <div>Masuk: ${Formatters.formatNumber(stock.masuk)}</div>
                  <div>Keluar: ${Formatters.formatNumber(stock.keluar)}</div>
                </div>
              </div>
            </div>
            <div class="card-footer bg-light py-2 px-3 border-top d-flex justify-content-between align-items-center">
              <small class="text-muted">Maks Simpan: ${stock.max_storage_days} Hari</small>
              <button class="btn btn-xs btn-outline-secondary" onclick="WasteModule.openAdjustmentModal('${stock.waste_type_id}', '${stock.satuan}')">
                <i class="bi bi-sliders me-1"></i>Koreksi Stok
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  },

  renderStockLedger() {
    const tbody = document.getElementById("tbody-stock-ledger");
    if (!tbody) return;

    // Combine all chronological events: receipts, transports, adjustments
    const ledger = [];

    this.receiptItems.forEach(ri => {
      const r = this.receipts.find(rec => rec.id === ri.receipt_id);
      if (r && r.status === "confirmed") {
        const wt = MastersModule.wasteTypes.find(w => w.id === ri.waste_type_id) || { nama_limbah: "-" };
        ledger.push({
          tanggal: r.tanggal_terima,
          no_ref: r.no_penerimaan,
          jenis: "Penerimaan TPS",
          nama_limbah: wt.nama_limbah,
          satuan: ri.satuan,
          masuk: ri.jumlah_diterima,
          keluar: 0,
          petugas: r.petugas_tps,
          keterangan: r.catatan || "Penerimaan dari ruangan"
        });
      }
    });

    this.transportItems.forEach(ti => {
      const t = this.transports.find(tr => tr.id === ti.transport_id);
      if (t && t.status_pengangkutan === "confirmed") {
        const wt = MastersModule.wasteTypes.find(w => w.id === ti.waste_type_id) || { nama_limbah: "-" };
        ledger.push({
          tanggal: t.tanggal_angkut,
          no_ref: t.no_manifest,
          jenis: "Pengangkutan Keluar",
          nama_limbah: wt.nama_limbah,
          satuan: ti.satuan,
          masuk: 0,
          keluar: ti.jumlah_angkut,
          petugas: t.petugas_penyerah,
          keterangan: `No. Pol: ${t.no_kendaraan} (${t.nama_pengemudi})`
        });
      }
    });

    this.adjustments.forEach(adj => {
      const wt = MastersModule.wasteTypes.find(w => w.id === adj.waste_type_id) || { nama_limbah: "-" };
      ledger.push({
        tanggal: adj.tanggal,
        no_ref: adj.no_penyesuaian,
        jenis: adj.tipe_penyesuaian === "tambah" ? "Penyesuaian (+)" : "Penyesuaian (-)",
        nama_limbah: wt.nama_limbah,
        satuan: adj.satuan,
        masuk: adj.tipe_penyesuaian === "tambah" ? adj.jumlah : 0,
        keluar: adj.tipe_penyesuaian === "kurang" ? adj.jumlah : 0,
        petugas: adj.disetujui_oleh,
        keterangan: adj.alasan
      });
    });

    ledger.sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));

    if (!ledger.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada riwayat mutasi stok TPS.</td></tr>`;
      return;
    }

    tbody.innerHTML = ledger.map((row, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${Formatters.formatDateIndo(row.tanggal)}</strong></td>
        <td><small class="font-monospace text-primary">${row.no_ref}</small></td>
        <td>
          <span class="badge ${row.jenis.includes('Penerimaan') ? 'badge-soft-success' : (row.jenis.includes('Pengangkutan') ? 'badge-soft-danger' : 'badge-soft-warning')}">
            ${row.jenis}
          </span>
        </td>
        <td><strong>${row.nama_limbah}</strong></td>
        <td class="text-end text-success">${row.masuk > 0 ? '+' + Formatters.formatQtyWithUnit(row.masuk, row.satuan) : '-'}</td>
        <td class="text-end text-danger">${row.keluar > 0 ? '-' + Formatters.formatQtyWithUnit(row.keluar, row.satuan) : '-'}</td>
        <td><small>${row.keterangan || '-'}</small></td>
      </tr>
    `).join("");
  },

  openAdjustmentModal(wasteTypeId = "", unit = "kg") {
    const modalEl = document.getElementById("modal-stock-adjustment");
    if (!modalEl) return;
    const form = document.getElementById("form-stock-adjustment");
    form.reset();

    const todayStr = new Date().toISOString().slice(0, 10);
    form.elements["tanggal"].value = todayStr;
    form.elements["no_penyesuaian"].value = `ADJ-${todayStr.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    form.elements["disetujui_oleh"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;

    // Populate Waste Type options
    const selectWaste = form.elements["waste_type_id"];
    selectWaste.innerHTML = MastersModule.wasteTypes.filter(w => w.is_active).map(w => `
      <option value="${w.id}" data-satuan="${w.satuan}" ${w.id === wasteTypeId ? 'selected' : ''}>${w.kode_limbah} - ${w.nama_limbah} (${w.satuan})</option>
    `).join("");

    form.elements["satuan"].value = unit;
    new bootstrap.Modal(modalEl).show();
  },

  async saveAdjustment(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      no_penyesuaian: form.elements["no_penyesuaian"].value.trim(),
      tanggal: form.elements["tanggal"].value,
      waste_type_id: form.elements["waste_type_id"].value,
      tipe_penyesuaian: form.elements["tipe_penyesuaian"].value,
      jumlah: parseFloat(form.elements["jumlah"].value),
      satuan: form.elements["satuan"].value,
      alasan: form.elements["alasan"].value.trim(),
      disetujui_oleh: form.elements["disetujui_oleh"].value.trim()
    };

    if (isNaN(data.jumlah) || data.jumlah <= 0) {
      Notify.warning("Jumlah penyesuaian harus lebih dari 0!");
      return;
    }

    try {
      await SupabaseService.insert("tps_adjustments", data);
      Notify.success("Penyesuaian stok resmi berhasil disimpan dengan jejak audit.");
      bootstrap.Modal.getInstance(document.getElementById("modal-stock-adjustment")).hide();
      await this.loadAdjustments();
      this.calculateStock();
      this.renderStockCards();
      this.renderStockLedger();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan Penyesuaian");
    }
  },

  // ==========================================================================
  // 4. PENGANGKUTAN KELUAR KE PIHAK KETIGA
  // ==========================================================================
  async loadTransports() {
    try {
      this.transports = await SupabaseService.select("waste_transports", {
        order: { column: "tanggal_angkut", ascending: false }
      });
      this.transportItems = await SupabaseService.select("waste_transport_items");
      this.renderTransportsTable();
    } catch (err) {
      console.error("Gagal memuat pengangkutan:", err);
    }
  },

  renderTransportsTable() {
    const tbody = document.getElementById("tbody-waste-transports");
    if (!tbody) return;

    if (!this.transports.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada catatan pengangkutan limbah keluar dari TPS.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.transports.map((t, idx) => {
      const transporter = MastersModule.transporters.find(tr => tr.id === t.transporter_id) || { nama_perusahaan: "-" };
      const items = this.transportItems.filter(ti => ti.transport_id === t.id);
      const itemsDesc = items.map(i => {
        const wt = MastersModule.wasteTypes.find(w => w.id === i.waste_type_id) || { nama_limbah: "Limbah" };
        return `<div><small>• ${wt.nama_limbah}: <strong>${Formatters.formatQtyWithUnit(i.jumlah_angkut, i.satuan)}</strong></small></div>`;
      }).join("");

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            <strong class="text-primary">${t.no_manifest}</strong><br>
            <small class="text-muted">${Formatters.formatDateIndo(t.tanggal_angkut)} ${Formatters.formatTime(t.waktu_angkut)}</small>
          </td>
          <td>
            <strong>${transporter.nama_perusahaan}</strong><br>
            <small class="badge bg-secondary">${t.no_kendaraan}</small> <small>(${t.nama_pengemudi})</small>
          </td>
          <td>${itemsDesc || "-"}</td>
          <td>${t.tujuan_pengelolaan}</td>
          <td class="text-center">${Formatters.renderStatusBadge(t.status_dokumen)}</td>
          <td class="text-center">${Formatters.renderStatusBadge(t.status_pengangkutan)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary" onclick="WasteModule.viewTransportDetails('${t.id}')">
              <i class="bi bi-file-earmark-text me-1"></i>Dokumen
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  openTransportModal() {
    const modalEl = document.getElementById("modal-waste-transport");
    if (!modalEl) return;
    const form = document.getElementById("form-waste-transport");
    form.reset();

    const todayStr = new Date().toISOString().slice(0, 10);
    form.elements["tanggal_angkut"].value = todayStr;
    form.elements["waktu_angkut"].value = new Date().toTimeString().slice(0, 5);
    form.elements["no_manifest"].value = `MNF-${todayStr.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    form.elements["petugas_penyerah"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;

    // Transporter select
    const transSelect = form.elements["transporter_id"];
    transSelect.innerHTML = `<option value="">-- Pilih Transporter Berizin --</option>` +
      MastersModule.transporters.filter(t => t.is_active).map(t => `
        <option value="${t.id}" data-plat="${t.no_kendaraan_default || ''}">${t.nama_perusahaan} (Izin: ${t.no_izin_klhk})</option>
      `).join("");

    // Multi-item transport container
    const container = document.getElementById("transport-items-container");
    container.innerHTML = "";
    this.addTransportItemRow();

    new bootstrap.Modal(modalEl).show();
  },

  onTransporterSelect(selectEl) {
    const opt = selectEl.options[selectEl.selectedIndex];
    const plat = opt.getAttribute("data-plat");
    const platInput = document.getElementById("transport_no_kendaraan");
    if (platInput && plat) {
      platInput.value = plat;
    }
  },

  addTransportItemRow() {
    const container = document.getElementById("transport-items-container");
    if (!container) return;
    const rowId = "tr-item-" + Date.now() + Math.random().toString(36).substr(2, 4);

    // Filter waste types that currently have available stock in TPS
    const availableStocks = this.calculatedStock.filter(s => s.saldo_akhir > 0);
    const options = availableStocks.length > 0 ? availableStocks.map(s => `
      <option value="${s.waste_type_id}" data-satuan="${s.satuan}" data-stock="${s.saldo_akhir}">
        ${s.kode_limbah} - ${s.nama_limbah} (Stok: ${s.saldo_akhir} ${s.satuan})
      </option>
    `).join("") : MastersModule.wasteTypes.map(w => `
      <option value="${w.id}" data-satuan="${w.satuan}" data-stock="0">${w.kode_limbah} - ${w.nama_limbah} (${w.satuan})</option>
    `).join("");

    const rowHtml = `
      <div class="row g-2 align-items-center mb-2 p-2 border rounded bg-light transport-entry-row" id="${rowId}">
        <div class="col-md-5">
          <label class="form-label small mb-1">Limbah dari TPS</label>
          <select class="form-select form-select-sm sel-tr-waste" required onchange="WasteModule.onTransportWasteChanged(this, '${rowId}')">
            <option value="">-- Pilih Limbah --</option>
            ${options}
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">Jumlah Angkut</label>
          <input type="number" step="0.01" min="0.01" class="form-control form-select-sm inp-tr-qty" required placeholder="0.00">
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1">Satuan</label>
          <input type="text" class="form-control form-select-sm inp-tr-satuan bg-white" readonly value="kg">
        </div>
        <div class="col-md-1 text-end pt-3">
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="document.getElementById('${rowId}').remove()">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", rowHtml);
  },

  onTransportWasteChanged(selectEl, rowId) {
    const opt = selectEl.options[selectEl.selectedIndex];
    const unit = opt.getAttribute("data-satuan") || "kg";
    const maxStock = parseFloat(opt.getAttribute("data-stock")) || 0;
    const row = document.getElementById(rowId);
    if (row) {
      row.querySelector(".inp-tr-satuan").value = unit;
      const qtyInput = row.querySelector(".inp-tr-qty");
      if (maxStock > 0) {
        qtyInput.max = maxStock;
        qtyInput.placeholder = `Maks ${maxStock}`;
      }
    }
  },

  async saveTransport(e) {
    e.preventDefault();
    const form = e.target;
    const rows = document.querySelectorAll(".transport-entry-row");

    if (!rows.length) {
      Notify.warning("Pilih minimal satu limbah untuk diangkut!");
      return;
    }

    const transportData = {
      no_manifest: form.elements["no_manifest"].value.trim(),
      tanggal_angkut: form.elements["tanggal_angkut"].value,
      waktu_angkut: form.elements["waktu_angkut"].value,
      transporter_id: form.elements["transporter_id"].value,
      tujuan_pengelolaan: form.elements["tujuan_pengelolaan"].value.trim(),
      no_kendaraan: form.elements["no_kendaraan"].value.trim().toUpperCase(),
      nama_pengemudi: form.elements["nama_pengemudi"].value.trim(),
      petugas_penyerah: form.elements["petugas_penyerah"].value.trim(),
      status_dokumen: form.elements["status_dokumen"].value,
      status_pengangkutan: "confirmed",
      catatan: form.elements["catatan"].value.trim()
    };

    // Validate available stock for each item before allowing confirmation
    const itemsToInsert = [];
    let valid = true;

    rows.forEach(r => {
      const wasteTypeId = r.querySelector(".sel-tr-waste").value;
      const qty = parseFloat(r.querySelector(".inp-tr-qty").value);
      const unit = r.querySelector(".inp-tr-satuan").value;

      if (!wasteTypeId || isNaN(qty) || qty <= 0) {
        valid = false;
        return;
      }

      // Check current stock
      const stockItem = this.calculatedStock.find(s => s.waste_type_id === wasteTypeId && s.satuan === unit);
      const available = stockItem ? stockItem.saldo_akhir : 0;

      if (qty > available) {
        Notify.error(`Jumlah angkut (${qty} ${unit}) melebihi stok tersedia (${available} ${unit})! Stok tidak boleh minus.`);
        valid = false;
        return;
      }

      itemsToInsert.push({
        waste_type_id: wasteTypeId,
        jumlah_angkut: qty,
        satuan: unit
      });
    });

    if (!valid || !itemsToInsert.length) return;

    // Upload attachment if any
    const fileInput = form.elements["bukti_timbang_file"];
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        const uploaded = await SupabaseService.uploadDocument(fileInput.files[0], "transports");
        transportData.bukti_timbang_url = uploaded.url;
      } catch (uploadErr) {
        console.warn("Upload gagal:", uploadErr);
      }
    }

    try {
      const inserted = await SupabaseService.insert("waste_transports", transportData);
      const transportId = inserted[0].id;

      itemsToInsert.forEach(i => { i.transport_id = transportId; });
      await SupabaseService.insert("waste_transport_items", itemsToInsert);

      Notify.success("Pengangkutan keluar terkonfirmasi. Stok di TPS telah otomatis dipotong.");
      bootstrap.Modal.getInstance(document.getElementById("modal-waste-transport")).hide();

      await this.loadTransports();
      this.calculateStock();
      this.renderStockCards();
      this.renderStockLedger();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan Pengangkutan");
    }
  },

  viewTransportDetails(id) {
    const t = this.transports.find(item => String(item.id) === String(id));
    if (!t) return;
    const transporter = MastersModule.transporters.find(tr => tr.id === t.transporter_id) || { nama_perusahaan: "-" };
    const items = this.transportItems.filter(ti => ti.transport_id === t.id);

    const itemsRows = items.map(i => {
      const wt = MastersModule.wasteTypes.find(w => w.id === i.waste_type_id) || { nama_limbah: "Limbah", kode_limbah: "-" };
      return `
        <tr>
          <td><span class="badge bg-dark">${wt.kode_limbah}</span> <strong>${wt.nama_limbah}</strong></td>
          <td class="text-end fw-bold">${Formatters.formatQtyWithUnit(i.jumlah_angkut, i.satuan)}</td>
        </tr>
      `;
    }).join("");

    const modalBody = document.getElementById("transport-details-body");
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-6">
          <small class="text-muted d-block">Nomor Manifest</small>
          <strong class="text-primary">${t.no_manifest}</strong>
        </div>
        <div class="col-6">
          <small class="text-muted d-block">Tanggal Pengangkutan</small>
          <strong>${Formatters.formatDateIndo(t.tanggal_angkut)} ${Formatters.formatTime(t.waktu_angkut)}</strong>
        </div>
        <div class="col-6">
          <small class="text-muted d-block">Perusahaan Pengangkut</small>
          <strong>${transporter.nama_perusahaan}</strong>
        </div>
        <div class="col-6">
          <small class="text-muted d-block">Armada & Sopir</small>
          <strong>${t.no_kendaraan}</strong> (${t.nama_pengemudi})
        </div>
        <div class="col-12">
          <small class="text-muted d-block">Tujuan Pengelolaan</small>
          <p class="mb-0 fw-bold">${t.tujuan_pengelolaan}</p>
        </div>
      </div>
      <h6 class="fw-bold border-bottom pb-2 mt-3">Rincian Limbah yang Diserahkan</h6>
      <table class="table table-sm table-bordered">
        <thead class="table-light">
          <tr>
            <th>Jenis Limbah B3</th>
            <th class="text-end">Jumlah Angkut</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      <div class="d-flex justify-content-between align-items-center mt-3">
        <div>Status Dokumen: ${Formatters.renderStatusBadge(t.status_dokumen)}</div>
        ${t.bukti_timbang_url ? `<a href="${t.bukti_timbang_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark-check me-1"></i>Bukti Timbang / Dokumen</a>` : '<span class="text-muted small">Belum ada lampiran berkas</span>'}
      </div>
    `;

    new bootstrap.Modal(document.getElementById("modal-transport-details")).show();
  }
};

window.WasteModule = WasteModule;
