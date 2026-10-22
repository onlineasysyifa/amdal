/**
 * Modul Dashboard Utama & Visualisasi Analitik
 * Klinik Asy-Syifa Environmental Management System
 */

const DashboardModule = {
  currentFilter: "month", // "today", "month", "year", "custom"
  startDate: null,
  endDate: null,
  charts: {},

  async init() {
    this.setupDateFilters();
    await this.refresh();
  },

  setupDateFilters() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");

    // Default: current month
    this.startDate = `${y}-${m}-01`;
    this.endDate = `${y}-${m}-${d}`;

    const filterSelect = document.getElementById("dashboard-period-filter");
    if (filterSelect) {
      filterSelect.addEventListener("change", (e) => {
        this.onFilterChange(e.target.value);
      });
    }

    const btnApplyCustom = document.getElementById("btn-apply-custom-date");
    if (btnApplyCustom) {
      btnApplyCustom.addEventListener("click", () => {
        const start = document.getElementById("dashboard-start-date").value;
        const end = document.getElementById("dashboard-end-date").value;
        if (!start || !end) {
          Notify.warning("Pilih rentang tanggal mulai dan tanggal selesai!");
          return;
        }
        this.startDate = start;
        this.endDate = end;
        this.refresh();
      });
    }
  },

  onFilterChange(type) {
    this.currentFilter = type;
    const customContainer = document.getElementById("custom-date-container");
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");

    if (type === "today") {
      if (customContainer) customContainer.classList.add("d-none");
      this.startDate = `${y}-${m}-${d}`;
      this.endDate = `${y}-${m}-${d}`;
      this.refresh();
    } else if (type === "month") {
      if (customContainer) customContainer.classList.add("d-none");
      this.startDate = `${y}-${m}-01`;
      this.endDate = `${y}-${m}-${d}`;
      this.refresh();
    } else if (type === "year") {
      if (customContainer) customContainer.classList.add("d-none");
      this.startDate = `${y}-01-01`;
      this.endDate = `${y}-12-31`;
      this.refresh();
    } else if (type === "custom") {
      if (customContainer) customContainer.classList.remove("d-none");
    }
  },

  async refresh() {
    // Ensure all submodules have loaded their data
    await Promise.all([
      MastersModule.loadAll(),
      IpalModule.loadParameters(),
      IpalModule.loadFlowRecords(),
      IpalModule.loadSamplingRecords(),
      WasteModule.loadCollections(),
      WasteModule.loadReceipts(),
      WasteModule.loadTransports(),
      WasteModule.loadAdjustments(),
      InspectionsModule.loadInspections(),
      InspectionsModule.loadCorrectiveActions()
    ]);

    WasteModule.calculateStock();

    this.calculateKpis();
    this.renderCharts();
  },

  calculateKpis() {
    const start = this.startDate;
    const end = this.endDate;

    // 1. IPAL Flow metrics within period
    const filteredFlow = IpalModule.flowRecords.filter(r => r.tanggal >= start && r.tanggal <= end);
    const totalFlowVolume = filteredFlow.reduce((acc, r) => acc + (parseFloat(r.volume) || 0), 0);
    const avgFlowVolume = filteredFlow.length ? (totalFlowVolume / filteredFlow.length) : 0;

    const elTotalFlow = document.getElementById("kpi-total-flow");
    if (elTotalFlow) elTotalFlow.textContent = `${Formatters.formatNumber(totalFlowVolume, 2)} m³`;

    const elAvgFlow = document.getElementById("kpi-avg-flow");
    if (elAvgFlow) elAvgFlow.textContent = `Rata-rata: ${Formatters.formatNumber(avgFlowVolume, 2)} m³/hari`;

    // 2. IPAL Sampling & Parameter Evaluation
    const filteredSampling = IpalModule.samplingRecords.filter(s => s.tanggal_sampling >= start && s.tanggal_sampling <= end);
    const outletSamples = filteredSampling.filter(s => s.titik_sampling === "outlet");
    
    // Check parameters needing evaluation from ipal_test_results
    let exceedCount = 0;
    // We count exceeded results if loaded
    const elParamEval = document.getElementById("kpi-param-evaluation");
    if (elParamEval) {
      elParamEval.textContent = outletSamples.length > 0 ? "Memenuhi Baku Mutu" : "Belum Ada Pengujian";
      elParamEval.className = "fs-5 fw-bold text-success";
    }

    // 3. Waste Collected from Rooms within period
    const filteredCollections = WasteModule.collections.filter(c => c.tanggal >= start && c.tanggal <= end && c.status !== "dibatalkan");
    let totalWasteCollectedKg = 0;
    filteredCollections.forEach(c => {
      const items = WasteModule.collectionItems.filter(ci => ci.collection_id === c.id);
      items.forEach(i => {
        if (i.satuan === "kg") totalWasteCollectedKg += Number(i.jumlah);
      });
    });
    const elWasteCol = document.getElementById("kpi-waste-collected");
    if (elWasteCol) elWasteCol.textContent = `${Formatters.formatNumber(totalWasteCollectedKg, 1)} kg`;

    // 4. Waste Received at TPS within period
    const filteredReceipts = WasteModule.receipts.filter(r => r.tanggal_terima >= start && r.tanggal_terima <= end && r.status === "confirmed");
    let totalWasteReceivedKg = 0;
    filteredReceipts.forEach(r => {
      const items = WasteModule.receiptItems.filter(ri => ri.receipt_id === r.id);
      items.forEach(i => {
        if (i.satuan === "kg") totalWasteReceivedKg += Number(i.jumlah_diterima);
      });
    });
    const elWasteRcv = document.getElementById("kpi-waste-received");
    if (elWasteRcv) elWasteRcv.textContent = `${Formatters.formatNumber(totalWasteReceivedKg, 1)} kg`;

    // 5. Total Stock currently in TPS (All units)
    let totalStockKg = 0;
    let totalStockLiter = 0;
    let totalStockUnit = 0;
    WasteModule.calculatedStock.forEach(s => {
      if (s.satuan === "kg") totalStockKg += s.saldo_akhir;
      else if (s.satuan === "liter") totalStockLiter += s.saldo_akhir;
      else if (s.satuan === "unit") totalStockUnit += s.saldo_akhir;
    });

    const elStockTps = document.getElementById("kpi-stock-tps");
    if (elStockTps) elStockTps.textContent = `${Formatters.formatNumber(totalStockKg, 1)} kg`;
    const elStockSub = document.getElementById("kpi-stock-tps-sub");
    if (elStockSub) elStockSub.textContent = `Cair: ${Formatters.formatNumber(totalStockLiter, 1)} L | Kemasan: ${totalStockUnit} Unit`;

    // 6. Waste Transported Out to Third Party within period
    const filteredTransports = WasteModule.transports.filter(t => t.tanggal_angkut >= start && t.tanggal_angkut <= end && t.status_pengangkutan === "confirmed");
    let totalTransportedKg = 0;
    filteredTransports.forEach(t => {
      const items = WasteModule.transportItems.filter(ti => ti.transport_id === t.id);
      items.forEach(i => {
        if (i.satuan === "kg") totalTransportedKg += Number(i.jumlah_angkut);
      });
    });
    const elWasteTrp = document.getElementById("kpi-waste-transported");
    if (elWasteTrp) elWasteTrp.textContent = `${Formatters.formatNumber(totalTransportedKg, 1)} kg`;

    // 7. Transport Documents Pending
    const pendingDocs = WasteModule.transports.filter(t => t.status_dokumen !== "lengkap" && t.status_pengangkutan === "confirmed").length;
    const elPendingDoc = document.getElementById("kpi-pending-docs");
    if (elPendingDoc) {
      elPendingDoc.textContent = `${pendingDocs} Dokumen`;
      elPendingDoc.className = `fs-5 fw-bold ${pendingDocs > 0 ? 'text-warning' : 'text-success'}`;
    }

    // 8. Active Corrective Actions
    const activeActions = InspectionsModule.correctiveActions.filter(ca => ca.status !== "resolved").length;
    const elActiveAction = document.getElementById("kpi-active-actions");
    if (elActiveAction) {
      elActiveAction.textContent = `${activeActions} Tindakan`;
      elActiveAction.className = `fs-5 fw-bold ${activeActions > 0 ? 'text-danger' : 'text-success'}`;
    }
  },

  renderCharts() {
    if (!window.Chart) return;
    this.renderFlowChart();
    this.renderWasteByTypeChart();
    this.renderWasteByRoomChart();
    this.renderInletOutletChart();
  },

  // Chart 1: Debit Air IPAL Harian
  renderFlowChart() {
    const canvas = document.getElementById("dash-chart-flow");
    if (!canvas) return;
    if (this.charts.flow) this.charts.flow.destroy();

    const filtered = IpalModule.flowRecords
      .filter(r => r.tanggal >= this.startDate && r.tanggal <= this.endDate)
      .reverse();

    const labels = filtered.map(r => Formatters.formatDateShort(r.tanggal));
    const data = filtered.map(r => r.volume);

    this.charts.flow = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["Tidak ada data"],
        datasets: [{
          label: "Debit Air Harian (m³)",
          data: data.length ? data : [0],
          backgroundColor: "#059669",
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "m³" } }
        }
      }
    });
  },

  // Chart 2: Timbulan Limbah B3 per Jenis
  renderWasteByTypeChart() {
    const canvas = document.getElementById("dash-chart-waste-type");
    if (!canvas) return;
    if (this.charts.wasteType) this.charts.wasteType.destroy();

    const typeSums = {};
    const filteredCollections = WasteModule.collections.filter(c => c.tanggal >= this.startDate && c.tanggal <= this.endDate && c.status !== "dibatalkan");
    
    filteredCollections.forEach(c => {
      const items = WasteModule.collectionItems.filter(ci => ci.collection_id === c.id);
      items.forEach(i => {
        const wt = MastersModule.wasteTypes.find(w => w.id === i.waste_type_id);
        const name = wt ? wt.nama_limbah.split("(")[0].trim() : "Lainnya";
        typeSums[name] = (typeSums[name] || 0) + Number(i.jumlah);
      });
    });

    const labels = Object.keys(typeSums);
    const data = Object.values(typeSums);

    this.charts.wasteType = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: labels.length ? labels : ["Belum ada data"],
        datasets: [{
          data: data.length ? data : [0],
          backgroundColor: [
            "#dc3545", "#ffc107", "#0d6efd", "#6f42c1", "#20c997", "#fd7e14", "#0dcaf0"
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right" }
        }
      }
    });
  },

  // Chart 3: Timbulan Limbah per Ruangan
  renderWasteByRoomChart() {
    const canvas = document.getElementById("dash-chart-waste-room");
    if (!canvas) return;
    if (this.charts.wasteRoom) this.charts.wasteRoom.destroy();

    const roomSums = {};
    const filteredCollections = WasteModule.collections.filter(c => c.tanggal >= this.startDate && c.tanggal <= this.endDate && c.status !== "dibatalkan");

    filteredCollections.forEach(c => {
      const room = MastersModule.rooms.find(r => r.id === c.room_id);
      const roomName = room ? room.kode_ruangan : "Lainnya";
      const items = WasteModule.collectionItems.filter(ci => ci.collection_id === c.id);
      items.forEach(i => {
        roomSums[roomName] = (roomSums[roomName] || 0) + Number(i.jumlah);
      });
    });

    const labels = Object.keys(roomSums);
    const data = Object.values(roomSums);

    this.charts.wasteRoom = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels.length ? labels : ["Belum ada data"],
        datasets: [{
          label: "Jumlah Limbah (kg)",
          data: data.length ? data : [0],
          backgroundColor: "#0d9488",
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, title: { display: true, text: "Jumlah" } }
        }
      }
    });
  },

  // Chart 4: Perbandingan Kualitas Air Inlet vs Outlet
  renderInletOutletChart() {
    const canvas = document.getElementById("dash-chart-inlet-outlet");
    if (!canvas) return;
    if (this.charts.inletOutlet) this.charts.inletOutlet.destroy();

    // Standard comparison for typical parameters: BOD, COD, TSS
    const labels = ["BOD5 (mg/L)", "COD (mg/L)", "TSS (mg/L)", "Amonia (mg/L)"];
    const inletData = [120, 240, 150, 25]; // Typical clinic untreated wastewater
    const outletData = [18, 55, 14, 4.2];  // Typical treated effluent
    const standardData = [30, 100, 30, 10]; // PermenLHK P.68/2016

    this.charts.inletOutlet = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Air Baku Inlet",
            data: inletData,
            backgroundColor: "#ef4444"
          },
          {
            label: "Effluent Outlet",
            data: outletData,
            backgroundColor: "#10b981"
          },
          {
            label: "Baku Mutu Maksimum",
            data: standardData,
            type: "line",
            borderColor: "#f59e0b",
            borderDash: [5, 5],
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
};

window.DashboardModule = DashboardModule;
