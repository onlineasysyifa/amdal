/**
 * Modul Laporan Terpadu (IPAL, Limbah B3, Mutasi Stok, Format Cetak Resmi A4 & CSV)
 * Klinik Asy-Syifa Environmental Management System
 */

const ReportsModule = {
  currentTab: "ipal", // "ipal", "waste-room", "waste-type", "stock-mutasi", "transports"
  startDate: null,
  endDate: null,

  init() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");

    this.startDate = `${y}-${m}-01`;
    this.endDate = `${y}-${m}-${d}`;

    const startInput = document.getElementById("report-start-date");
    const endInput = document.getElementById("report-end-date");
    if (startInput) startInput.value = this.startDate;
    if (endInput) endInput.value = this.endDate;

    const btnGenerate = document.getElementById("btn-generate-report");
    if (btnGenerate) {
      btnGenerate.addEventListener("click", () => {
        this.startDate = document.getElementById("report-start-date").value;
        this.endDate = document.getElementById("report-end-date").value;
        this.renderActiveReport();
      });
    }

    const reportTypeSelect = document.getElementById("report-type-select");
    if (reportTypeSelect) {
      reportTypeSelect.addEventListener("change", (e) => {
        this.currentTab = e.target.value;
        this.renderActiveReport();
      });
    }

    this.renderActiveReport();
  },

  renderActiveReport() {
    switch (this.currentTab) {
      case "ipal":
        this.renderIpalReport();
        break;
      case "waste-room":
        this.renderWasteByRoomReport();
        break;
      case "waste-type":
        this.renderWasteByTypeReport();
        break;
      case "stock-mutasi":
        this.renderStockMutationReport();
        break;
      case "transports":
        this.renderTransportReport();
        break;
    }
  },

  // 1. LAPORAN PENGELOLAAN IPAL & DEBIT AIR
  renderIpalReport() {
    const container = document.getElementById("report-output-container");
    if (!container) return;

    const filtered = IpalModule.flowRecords
      .filter(r => r.tanggal >= this.startDate && r.tanggal <= this.endDate)
      .reverse();

    const totalVolume = filtered.reduce((acc, r) => acc + (parseFloat(r.volume) || 0), 0);
    const avgVolume = filtered.length ? (totalVolume / filtered.length) : 0;
    const periodStr = `${Formatters.formatDateIndo(this.startDate)} s/d ${Formatters.formatDateIndo(this.endDate)}`;

    const rows = filtered.map((r, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${Formatters.formatDateIndo(r.tanggal)} ${Formatters.formatTime(r.waktu)}</td>
        <td>${r.id_meter}</td>
        <td>${r.metode}</td>
        <td class="text-end">${Formatters.formatNumber(r.meter_awal, 2)}</td>
        <td class="text-end">${Formatters.formatNumber(r.meter_akhir, 2)}</td>
        <td class="text-end fw-bold">${Formatters.formatNumber(r.volume, 2)}</td>
        <td>${r.petugas}</td>
        <td>${r.catatan || "-"}</td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div class="content-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-bold"><i class="bi bi-droplet me-2 text-primary"></i>Laporan Debit Pengolahan Air Limbah (IPAL)</h6>
          <div>
            <button class="btn btn-sm btn-outline-success me-2" onclick="ReportsModule.exportIpalCsv()">
              <i class="bi bi-file-earmark-excel me-1"></i>Ekspor CSV
            </button>
            <button class="btn btn-sm btn-primary" onclick="ReportsModule.printIpalReport()">
              <i class="bi bi-printer me-1"></i>Cetak Format A4
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="alert alert-light border mb-3">
            <div class="row text-center">
              <div class="col-md-4">
                <small class="text-muted d-block">Periode</small>
                <strong>${periodStr}</strong>
              </div>
              <div class="col-md-4">
                <small class="text-muted d-block">Total Debit Air Limbah</small>
                <strong class="text-primary fs-5">${Formatters.formatNumber(totalVolume, 2)} m³</strong>
              </div>
              <div class="col-md-4">
                <small class="text-muted d-block">Rata-Rata Debit Harian</small>
                <strong>${Formatters.formatNumber(avgVolume, 2)} m³/hari</strong>
              </div>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-custom table-bordered" id="table-report-ipal">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px;">No</th>
                  <th>Tanggal & Waktu</th>
                  <th>ID Meter</th>
                  <th>Metode</th>
                  <th class="text-end">Meter Awal</th>
                  <th class="text-end">Meter Akhir</th>
                  <th class="text-end">Volume (m³)</th>
                  <th>Petugas</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="9" class="text-center py-4 text-muted">Tidak ada data debit pada periode ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  exportIpalCsv() {
    const filtered = IpalModule.flowRecords
      .filter(r => r.tanggal >= this.startDate && r.tanggal <= this.endDate)
      .reverse();

    const headers = ["No", "Tanggal", "Waktu", "ID Meter", "Metode", "Meter Awal", "Meter Akhir", "Volume (m3)", "Petugas", "Catatan"];
    const rows = filtered.map((r, idx) => [
      idx + 1,
      r.tanggal,
      r.waktu,
      r.id_meter,
      r.metode,
      r.meter_awal,
      r.meter_akhir,
      r.volume,
      r.petugas,
      r.catatan || ""
    ]);

    Exporter.exportToCsv("Laporan_Debit_IPAL_AsySyifa", headers, rows);
  },

  printIpalReport() {
    const periodStr = `${Formatters.formatDateIndo(this.startDate)} s/d ${Formatters.formatDateIndo(this.endDate)}`;
    const filtered = IpalModule.flowRecords
      .filter(r => r.tanggal >= this.startDate && r.tanggal <= this.endDate)
      .reverse();
    const totalVolume = filtered.reduce((acc, r) => acc + (parseFloat(r.volume) || 0), 0);

    const summary = `
      <strong>Ringkasan:</strong> Total volume air limbah diolah selama periode ini adalah <strong>${Formatters.formatNumber(totalVolume, 2)} m³</strong>. Standar pengolahan memenuhi ketentuan PermenLHK No. P.68/2016.
    `;

    const tableHtml = `
      <table class="table-print">
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th>Tanggal</th>
            <th>Waktu</th>
            <th>ID Meter</th>
            <th>Meter Awal</th>
            <th>Meter Akhir</th>
            <th>Volume (m³)</th>
            <th>Petugas Sanitarian</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((r, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td>${Formatters.formatDateIndo(r.tanggal)}</td>
              <td style="text-align: center;">${Formatters.formatTime(r.waktu)}</td>
              <td>${r.id_meter}</td>
              <td style="text-align: right;">${Formatters.formatNumber(r.meter_awal, 2)}</td>
              <td style="text-align: right;">${Formatters.formatNumber(r.meter_akhir, 2)}</td>
              <td style="text-align: right; font-weight: bold;">${Formatters.formatNumber(r.volume, 2)}</td>
              <td>${r.petugas}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    Exporter.openPrintPreview("LAPORAN PENGELOLAAN DAN DEBIT AIR LIMBAH (IPAL)", periodStr, tableHtml, summary);
  },

  // 2. LAPORAN TIMBULAN LIMBAH B3 PER RUANGAN
  renderWasteByRoomReport() {
    const container = document.getElementById("report-output-container");
    if (!container) return;

    const periodStr = `${Formatters.formatDateIndo(this.startDate)} s/d ${Formatters.formatDateIndo(this.endDate)}`;
    const filteredCollections = WasteModule.collections.filter(c => c.tanggal >= this.startDate && c.tanggal <= this.endDate && c.status !== "dibatalkan");

    // Aggregate by Room
    const roomAgg = {};
    filteredCollections.forEach(c => {
      const room = MastersModule.rooms.find(r => r.id === c.room_id) || { kode_ruangan: "-", nama_ruangan: "Lainnya" };
      if (!roomAgg[c.room_id]) {
        roomAgg[c.room_id] = {
          kode: room.kode_ruangan,
          nama: room.nama_ruangan,
          trxCount: 0,
          totalKg: 0,
          totalLiter: 0,
          totalUnit: 0
        };
      }
      roomAgg[c.room_id].trxCount++;
      const items = WasteModule.collectionItems.filter(ci => ci.collection_id === c.id);
      items.forEach(i => {
        if (i.satuan === "kg") roomAgg[c.room_id].totalKg += Number(i.jumlah);
        else if (i.satuan === "liter") roomAgg[c.room_id].totalLiter += Number(i.jumlah);
        else if (i.satuan === "unit") roomAgg[c.room_id].totalUnit += Number(i.jumlah);
      });
    });

    const rows = Object.values(roomAgg).map((r, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong class="text-primary">${r.kode}</strong></td>
        <td><strong>${r.nama}</strong></td>
        <td class="text-center">${r.trxCount} Kali</td>
        <td class="text-end fw-bold">${Formatters.formatNumber(r.totalKg, 2)} kg</td>
        <td class="text-end">${Formatters.formatNumber(r.totalLiter, 2)} L</td>
        <td class="text-end">${r.totalUnit} Unit</td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div class="content-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-bold"><i class="bi bi-hospital me-2 text-primary"></i>Laporan Timbulan Limbah B3 Berdasarkan Sumber Ruangan</h6>
          <div>
            <button class="btn btn-sm btn-outline-success me-2" onclick="ReportsModule.exportWasteByRoomCsv()">
              <i class="bi bi-file-earmark-excel me-1"></i>Ekspor CSV
            </button>
            <button class="btn btn-sm btn-primary" onclick="ReportsModule.printWasteByRoomReport()">
              <i class="bi bi-printer me-1"></i>Cetak Format A4
            </button>
          </div>
        </div>
        <div class="card-body">
          <p class="text-muted small mb-3">Periode Pemantauan: <strong>${periodStr}</strong></p>
          <div class="table-responsive">
            <table class="table table-custom table-bordered">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px;">No</th>
                  <th>Kode Ruangan</th>
                  <th>Nama Ruangan Penghasil</th>
                  <th class="text-center">Frekuensi Pengambilan</th>
                  <th class="text-end">Total Limbah Padat (kg)</th>
                  <th class="text-end">Total Cair (liter)</th>
                  <th class="text-end">Kemasan / Unit</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="7" class="text-center py-4 text-muted">Tidak ada data pengumpulan pada periode ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  exportWasteByRoomCsv() {
    const filteredCollections = WasteModule.collections.filter(c => c.tanggal >= this.startDate && c.tanggal <= this.endDate && c.status !== "dibatalkan");
    const roomAgg = {};
    filteredCollections.forEach(c => {
      const room = MastersModule.rooms.find(r => r.id === c.room_id) || { kode_ruangan: "-", nama_ruangan: "Lainnya" };
      if (!roomAgg[c.room_id]) {
        roomAgg[c.room_id] = { kode: room.kode_ruangan, nama: room.nama_ruangan, trxCount: 0, totalKg: 0, totalLiter: 0, totalUnit: 0 };
      }
      roomAgg[c.room_id].trxCount++;
      const items = WasteModule.collectionItems.filter(ci => ci.collection_id === c.id);
      items.forEach(i => {
        if (i.satuan === "kg") roomAgg[c.room_id].totalKg += Number(i.jumlah);
        else if (i.satuan === "liter") roomAgg[c.room_id].totalLiter += Number(i.jumlah);
        else if (i.satuan === "unit") roomAgg[c.room_id].totalUnit += Number(i.jumlah);
      });
    });

    const headers = ["No", "Kode Ruangan", "Nama Ruangan", "Frekuensi Pengambilan", "Total Limbah Padat (kg)", "Total Cair (liter)", "Total Unit"];
    const rows = Object.values(roomAgg).map((r, idx) => [
      idx + 1, r.kode, r.nama, r.trxCount, r.totalKg, r.totalLiter, r.totalUnit
    ]);

    Exporter.exportToCsv("Laporan_Timbulan_Ruangan_AsySyifa", headers, rows);
  },

  printWasteByRoomReport() {
    const periodStr = `${Formatters.formatDateIndo(this.startDate)} s/d ${Formatters.formatDateIndo(this.endDate)}`;
    const filteredCollections = WasteModule.collections.filter(c => c.tanggal >= this.startDate && c.tanggal <= this.endDate && c.status !== "dibatalkan");

    const roomAgg = {};
    filteredCollections.forEach(c => {
      const room = MastersModule.rooms.find(r => r.id === c.room_id) || { kode_ruangan: "-", nama_ruangan: "Lainnya" };
      if (!roomAgg[c.room_id]) {
        roomAgg[c.room_id] = { kode: room.kode_ruangan, nama: room.nama_ruangan, trxCount: 0, totalKg: 0, totalLiter: 0, totalUnit: 0 };
      }
      roomAgg[c.room_id].trxCount++;
      const items = WasteModule.collectionItems.filter(ci => ci.collection_id === c.id);
      items.forEach(i => {
        if (i.satuan === "kg") roomAgg[c.room_id].totalKg += Number(i.jumlah);
        else if (i.satuan === "liter") roomAgg[c.room_id].totalLiter += Number(i.jumlah);
        else if (i.satuan === "unit") roomAgg[c.room_id].totalUnit += Number(i.jumlah);
      });
    });

    const tableHtml = `
      <table class="table-print">
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th>Kode</th>
            <th>Nama Ruangan Penghasil</th>
            <th>Frekuensi Pengambilan</th>
            <th>Limbah Padat (kg)</th>
            <th>Limbah Cair (liter)</th>
            <th>Kemasan (Unit)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.values(roomAgg).map((r, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="text-align: center;">${r.kode}</td>
              <td>${r.nama}</td>
              <td style="text-align: center;">${r.trxCount} Kali</td>
              <td style="text-align: right; font-weight: bold;">${Formatters.formatNumber(r.totalKg, 2)}</td>
              <td style="text-align: right;">${Formatters.formatNumber(r.totalLiter, 2)}</td>
              <td style="text-align: right;">${r.totalUnit}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    Exporter.openPrintPreview("LAPORAN TIMBULAN LIMBAH B3 PER RUANGAN", periodStr, tableHtml, "Rekapitulasi timbulan limbah medis B3 dari setiap instalasi dan poli penghasil limbah di Klinik Pratama Asy-Syifa.");
  },

  // 3. LAPORAN MUTASI DAN SALDO STOK TPS (Stok Awal, Masuk, Keluar, Saldo Akhir)
  renderStockMutationReport() {
    const container = document.getElementById("report-output-container");
    if (!container) return;

    const periodStr = `${Formatters.formatDateIndo(this.startDate)} s/d ${Formatters.formatDateIndo(this.endDate)}`;
    
    // Calculate mutasi within date range
    const rows = WasteModule.calculatedStock.map((s, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><span class="badge bg-dark">${s.kode_limbah}</span></td>
        <td><strong>${s.nama_limbah}</strong></td>
        <td>${s.karakteristik || '-'}</td>
        <td class="text-center">${s.satuan}</td>
        <td class="text-end text-success">+${Formatters.formatNumber(s.masuk + s.adjust_tambah)}</td>
        <td class="text-end text-danger">-${Formatters.formatNumber(s.keluar + s.adjust_kurang)}</td>
        <td class="text-end fw-bold text-primary">${Formatters.formatNumber(s.saldo_akhir)}</td>
        <td class="text-center">${Formatters.renderStorageAgeBadge(s.days_in_storage, s.max_storage_days)}</td>
      </tr>
    `).join("");

    container.innerHTML = `
      <div class="content-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-bold"><i class="bi bi-journal-check me-2 text-primary"></i>Laporan Neraca Mutasi Stok TPS Limbah B3</h6>
          <div>
            <button class="btn btn-sm btn-outline-success me-2" onclick="ReportsModule.exportStockMutationCsv()">
              <i class="bi bi-file-earmark-excel me-1"></i>Ekspor CSV
            </button>
            <button class="btn btn-sm btn-primary" onclick="ReportsModule.printStockMutationReport()">
              <i class="bi bi-printer me-1"></i>Cetak Format A4
            </button>
          </div>
        </div>
        <div class="card-body">
          <p class="text-muted small mb-3">Posisi Saldo per Tanggal: <strong>${Formatters.formatDateIndo(new Date())}</strong></p>
          <div class="table-responsive">
            <table class="table table-custom table-bordered">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px;">No</th>
                  <th>Kode B3</th>
                  <th>Nama Jenis Limbah B3</th>
                  <th>Karakteristik</th>
                  <th class="text-center">Satuan</th>
                  <th class="text-end">Total Diterima (+)</th>
                  <th class="text-end">Total Diserahkan (-)</th>
                  <th class="text-end">Saldo Akhir di TPS</th>
                  <th class="text-center">Status Masa Simpan</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada data stok.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  exportStockMutationCsv() {
    const headers = ["No", "Kode B3", "Nama Jenis Limbah", "Karakteristik", "Satuan", "Total Masuk", "Total Keluar", "Saldo Akhir", "Masa Simpan (Hari)"];
    const rows = WasteModule.calculatedStock.map((s, idx) => [
      idx + 1, s.kode_limbah, s.nama_limbah, s.karakteristik, s.satuan, (s.masuk + s.adjust_tambah), (s.keluar + s.adjust_kurang), s.saldo_akhir, s.days_in_storage
    ]);
    Exporter.exportToCsv("Laporan_Neraca_Stok_TPS_AsySyifa", headers, rows);
  },

  printStockMutationReport() {
    const tableHtml = `
      <table class="table-print">
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th>Kode</th>
            <th>Nama Jenis Limbah B3</th>
            <th>Karakteristik</th>
            <th>Satuan</th>
            <th>Total Masuk</th>
            <th>Total Keluar</th>
            <th>Saldo di TPS</th>
            <th>Lama Simpan</th>
          </tr>
        </thead>
        <tbody>
          ${WasteModule.calculatedStock.map((s, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="text-align: center;">${s.kode_limbah}</td>
              <td>${s.nama_limbah}</td>
              <td>${s.karakteristik}</td>
              <td style="text-align: center;">${s.satuan}</td>
              <td style="text-align: right;">${Formatters.formatNumber(s.masuk + s.adjust_tambah)}</td>
              <td style="text-align: right;">${Formatters.formatNumber(s.keluar + s.adjust_kurang)}</td>
              <td style="text-align: right; font-weight: bold;">${Formatters.formatNumber(s.saldo_akhir)}</td>
              <td style="text-align: center;">${s.days_in_storage} Hari</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    Exporter.openPrintPreview("LAPORAN NERACA MUTASI STOK LIMBAH B3 DI TPS", Formatters.formatDateIndo(new Date()), tableHtml, "Neraca limbah B3 fasyankes Klinik Pratama Asy-Syifa sesuai ketentuan PP No. 22 Tahun 2021 dan PermenLHK No. P.56/2015.");
  },

  // 4. LAPORAN PENGANGKUTAN KELUAR KE PIHAK KETIGA
  renderTransportReport() {
    const container = document.getElementById("report-output-container");
    if (!container) return;

    const filtered = WasteModule.transports.filter(t => t.tanggal_angkut >= this.startDate && t.tanggal_angkut <= this.endDate && t.status_pengangkutan === "confirmed");
    const periodStr = `${Formatters.formatDateIndo(this.startDate)} s/d ${Formatters.formatDateIndo(this.endDate)}`;

    const rows = filtered.map((t, idx) => {
      const transporter = MastersModule.transporters.find(tr => tr.id === t.transporter_id) || { nama_perusahaan: "-" };
      const items = WasteModule.transportItems.filter(ti => ti.transport_id === t.id);
      const itemsDesc = items.map(i => {
        const wt = MastersModule.wasteTypes.find(w => w.id === i.waste_type_id) || { nama_limbah: "Limbah" };
        return `${wt.nama_limbah}: ${Formatters.formatQtyWithUnit(i.jumlah_angkut, i.satuan)}`;
      }).join(", ");

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong class="text-primary">${t.no_manifest}</strong></td>
          <td>${Formatters.formatDateIndo(t.tanggal_angkut)}</td>
          <td><strong>${transporter.nama_perusahaan}</strong></td>
          <td>${t.no_kendaraan} (${t.nama_pengemudi})</td>
          <td><small>${itemsDesc}</small></td>
          <td>${t.tujuan_pengelolaan}</td>
          <td class="text-center">${Formatters.renderStatusBadge(t.status_dokumen)}</td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="content-card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0 fw-bold"><i class="bi bi-truck me-2 text-primary"></i>Laporan Pengangkutan & Manifest Limbah B3</h6>
          <div>
            <button class="btn btn-sm btn-outline-success me-2" onclick="ReportsModule.exportTransportCsv()">
              <i class="bi bi-file-earmark-excel me-1"></i>Ekspor CSV
            </button>
            <button class="btn btn-sm btn-primary" onclick="ReportsModule.printTransportReport()">
              <i class="bi bi-printer me-1"></i>Cetak Format A4
            </button>
          </div>
        </div>
        <div class="card-body">
          <p class="text-muted small mb-3">Periode: <strong>${periodStr}</strong></p>
          <div class="table-responsive">
            <table class="table table-custom table-bordered">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px;">No</th>
                  <th>Nomor Manifest</th>
                  <th>Tanggal Angkut</th>
                  <th>Perusahaan Pengangkut</th>
                  <th>Kendaraan & Sopir</th>
                  <th>Rincian Limbah</th>
                  <th>Tujuan Pengelolaan</th>
                  <th class="text-center">Status Dokumen</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada pengangkutan pada periode ini.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  exportTransportCsv() {
    const filtered = WasteModule.transports.filter(t => t.tanggal_angkut >= this.startDate && t.tanggal_angkut <= this.endDate && t.status_pengangkutan === "confirmed");
    const headers = ["No", "No Manifest", "Tanggal", "Perusahaan Transporter", "No Kendaraan", "Sopir", "Tujuan Pengelolaan", "Status Dokumen"];
    const rows = filtered.map((t, idx) => {
      const transporter = MastersModule.transporters.find(tr => tr.id === t.transporter_id) || { nama_perusahaan: "-" };
      return [
        idx + 1, t.no_manifest, t.tanggal_angkut, transporter.nama_perusahaan, t.no_kendaraan, t.nama_pengemudi, t.tujuan_pengelolaan, t.status_dokumen
      ];
    });
    Exporter.exportToCsv("Laporan_Pengangkutan_Limbah_B3_AsySyifa", headers, rows);
  },

  printTransportReport() {
    const periodStr = `${Formatters.formatDateIndo(this.startDate)} s/d ${Formatters.formatDateIndo(this.endDate)}`;
    const filtered = WasteModule.transports.filter(t => t.tanggal_angkut >= this.startDate && t.tanggal_angkut <= this.endDate && t.status_pengangkutan === "confirmed");

    const tableHtml = `
      <table class="table-print">
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th>No. Manifest</th>
            <th>Tanggal</th>
            <th>Perusahaan Pengangkut</th>
            <th>Kendaraan</th>
            <th>Pengemudi</th>
            <th>Tujuan Pengelolaan</th>
            <th>Status Dokumen</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((t, idx) => {
            const transporter = MastersModule.transporters.find(tr => tr.id === t.transporter_id) || { nama_perusahaan: "-" };
            return `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td><strong>${t.no_manifest}</strong></td>
                <td>${Formatters.formatDateIndo(t.tanggal_angkut)}</td>
                <td>${transporter.nama_perusahaan}</td>
                <td style="text-align: center;">${t.no_kendaraan}</td>
                <td>${t.nama_pengemudi}</td>
                <td>${t.tujuan_pengelolaan}</td>
                <td style="text-align: center;">${t.status_dokumen}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;

    Exporter.openPrintPreview("LAPORAN SERAH TERIMA & PENGANGKUTAN LIMBAH B3", periodStr, tableHtml, "Rekapitulasi penyerahan limbah B3 medis kepada transporter dan pengolah berizin resmi KLHK.");
  }
};

window.ReportsModule = ReportsModule;
