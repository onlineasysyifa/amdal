/**
 * Modul IPAL (Instalasi Pengolahan Air Limbah)
 * Klinik Asy-Syifa Environmental Management System
 */

const IpalModule = {
  flowRecords: [],
  samplingRecords: [],
  parameters: [],
  maintenanceRecords: [],
  chartInstance: null,

  async init() {
    await Promise.all([
      this.loadParameters(),
      this.loadFlowRecords(),
      this.loadSamplingRecords(),
      this.loadMaintenanceRecords()
    ]);
    this.renderMonitoringChart();
  },

  // ==========================================================================
  // PARAMETER BAKU MUTU
  // ==========================================================================
  async loadParameters() {
    try {
      this.parameters = await SupabaseService.select("ipal_parameters", {
        order: { column: "display_order", ascending: true }
      });
    } catch (err) {
      console.error("Gagal memuat parameter IPAL:", err);
    }
  },

  // ==========================================================================
  // 1. PENCATATAN DEBIT AIR IPAL
  // ==========================================================================
  async loadFlowRecords() {
    try {
      this.flowRecords = await SupabaseService.select("ipal_flow_records", {
        order: { column: "tanggal", ascending: false }
      });
      this.renderFlowTable();
    } catch (err) {
      console.error("Gagal memuat catatan debit:", err);
    }
  },

  renderFlowTable() {
    const tbody = document.getElementById("tbody-ipal-flow");
    if (!tbody) return;

    if (!this.flowRecords.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Belum ada catatan debit air IPAL.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.flowRecords.map((r, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${Formatters.formatDateIndo(r.tanggal)}</strong> <small class="text-muted">${Formatters.formatTime(r.waktu)}</small></td>
        <td><span class="badge badge-soft-info">${r.id_meter}</span></td>
        <td>${r.metode}</td>
        <td class="text-end font-monospace">${Formatters.formatNumber(r.meter_awal, 2)}</td>
        <td class="text-end font-monospace">${Formatters.formatNumber(r.meter_akhir, 2)}</td>
        <td class="text-end font-monospace text-primary fw-bold">${Formatters.formatNumber(r.volume, 2)} m³</td>
        <td>${r.petugas}</td>
        <td class="text-center">
          <span class="badge ${r.status_verifikasi === 'verified' ? 'badge-soft-success' : 'badge-soft-warning'}">
            ${r.status_verifikasi === 'verified' ? 'Terverifikasi' : 'Pending'}
          </span>
        </td>
      </tr>
    `).join("");
  },

  openFlowModal() {
    const modalEl = document.getElementById("modal-ipal-flow");
    if (!modalEl) return;
    const form = document.getElementById("form-ipal-flow");
    form.reset();

    form.elements["tanggal"].value = new Date().toISOString().slice(0, 10);
    form.elements["waktu"].value = new Date().toTimeString().slice(0, 5);
    form.elements["petugas"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;

    // Prefill meter awal from latest recorded meter_akhir
    if (this.flowRecords.length > 0) {
      const latest = this.flowRecords[0];
      form.elements["meter_awal"].value = latest.meter_akhir;
    } else {
      form.elements["meter_awal"].value = "0";
    }

    this.calculateFlowDiff();
    new bootstrap.Modal(modalEl).show();
  },

  calculateFlowDiff() {
    const form = document.getElementById("form-ipal-flow");
    if (!form) return;
    const awal = parseFloat(form.elements["meter_awal"].value) || 0;
    const akhir = parseFloat(form.elements["meter_akhir"].value) || 0;
    const diff = akhir - awal;
    const diffDisplay = document.getElementById("flow-calculated-volume");
    if (diffDisplay) {
      if (diff >= 0) {
        diffDisplay.textContent = `${diff.toFixed(2)} m³`;
        diffDisplay.className = "fs-5 fw-bold text-success";
      } else {
        diffDisplay.textContent = `Angka akhir harus >= angka awal!`;
        diffDisplay.className = "fs-6 fw-bold text-danger";
      }
    }
  },

  async saveFlowRecord(e) {
    e.preventDefault();
    const form = e.target;
    const awal = parseFloat(form.elements["meter_awal"].value);
    const akhir = parseFloat(form.elements["meter_akhir"].value);

    if (isNaN(awal) || isNaN(akhir)) {
      Notify.warning("Masukkan angka meter yang valid!");
      return;
    }

    if (akhir < awal) {
      Notify.error("Angka meter akhir tidak boleh lebih kecil dari meter awal!");
      return;
    }

    const volume = akhir - awal;
    if (volume > 100) {
      const ok = await Notify.confirm(`Volume terhitung sangat besar (${volume.toFixed(2)} m³). Yakin angka ini benar?`, "Validasi Angka Meter");
      if (!ok) return;
    }

    const record = {
      tanggal: form.elements["tanggal"].value,
      waktu: form.elements["waktu"].value,
      petugas: form.elements["petugas"].value.trim(),
      id_meter: form.elements["id_meter"].value.trim(),
      metode: form.elements["metode"].value,
      meter_awal: awal,
      meter_akhir: akhir,
      volume: volume,
      catatan: form.elements["catatan"].value.trim(),
      status_verifikasi: "verified"
    };

    try {
      await SupabaseService.insert("ipal_flow_records", record);
      Notify.success("Catatan debit IPAL berhasil disimpan.");
      bootstrap.Modal.getInstance(document.getElementById("modal-ipal-flow")).hide();
      await this.loadFlowRecords();
      this.renderMonitoringChart();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan");
    }
  },

  // ==========================================================================
  // 2. HASIL PEMERIKSAAN INLET & OUTLET (Laboratorium & Lapangan)
  // ==========================================================================
  async loadSamplingRecords() {
    try {
      this.samplingRecords = await SupabaseService.select("ipal_sampling_records", {
        order: { column: "tanggal_sampling", ascending: false }
      });
      this.renderSamplingTable();
    } catch (err) {
      console.error("Gagal memuat data sampling:", err);
    }
  },

  renderSamplingTable() {
    const tbody = document.getElementById("tbody-ipal-sampling");
    if (!tbody) return;

    if (!this.samplingRecords.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Belum ada data pemeriksaan sampel air limbah.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.samplingRecords.map((s, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${s.no_sampel}</strong></td>
        <td>${Formatters.formatDateIndo(s.tanggal_sampling)}</td>
        <td>
          <span class="badge ${s.titik_sampling === 'outlet' ? 'badge-soft-success' : 'badge-soft-warning'}">
            ${s.titik_sampling.toUpperCase()}
          </span>
        </td>
        <td>${s.jenis_pemeriksaan === 'laboratorium' ? 'Laboratorium Terakreditasi' : 'Pemeriksaan Lapangan'}</td>
        <td>pH: ${s.ph_lapangan || "-"} | Suhu: ${s.suhu_lapangan ? s.suhu_lapangan + '°C' : "-"}</td>
        <td>${s.lab_penguji || "-"} <small class="text-muted">(${s.no_laporan || "-"})</small></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary" onclick="IpalModule.viewSamplingDetails('${s.id}')" title="Lihat Hasil Uji">
            <i class="bi bi-eye me-1"></i>Detail
          </button>
        </td>
      </tr>
    `).join("");
  },

  openSamplingModal() {
    const modalEl = document.getElementById("modal-ipal-sampling");
    if (!modalEl) return;
    const form = document.getElementById("form-ipal-sampling");
    form.reset();

    const todayStr = new Date().toISOString().slice(0, 10);
    form.elements["tanggal_sampling"].value = todayStr;
    form.elements["waktu_sampling"].value = new Date().toTimeString().slice(0, 5);
    form.elements["no_sampel"].value = `SMPL-${todayStr.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    // Build dynamic parameter inputs from active ipal_parameters
    const paramContainer = document.getElementById("sampling-parameters-inputs");
    if (paramContainer && this.parameters.length) {
      paramContainer.innerHTML = this.parameters.map(p => `
        <div class="col-md-6 mb-3">
          <label class="form-label small fw-bold mb-1">${p.nama_parameter} (${p.satuan})</label>
          <div class="input-group input-group-sm">
            <input type="number" step="0.01" class="form-control param-value-input" data-param-id="${p.id}" data-param-code="${p.kode_parameter}" placeholder="Hasil uji...">
            <span class="input-group-text bg-light text-muted small">Baku: ${p.range_min ? p.range_min + ' - ' : '<= '}${p.baku_mutu_outlet}</span>
          </div>
        </div>
      `).join("");
    }

    new bootstrap.Modal(modalEl).show();
  },

  async saveSamplingRecord(e) {
    e.preventDefault();
    const form = e.target;

    const titik = form.elements["titik_sampling"].value;
    const samplingData = {
      no_sampel: form.elements["no_sampel"].value.trim(),
      tanggal_sampling: form.elements["tanggal_sampling"].value,
      waktu_sampling: form.elements["waktu_sampling"].value,
      titik_sampling: titik,
      jenis_pemeriksaan: form.elements["jenis_pemeriksaan"].value,
      lab_penguji: form.elements["lab_penguji"].value.trim(),
      no_laporan: form.elements["no_laporan"].value.trim(),
      ph_lapangan: parseFloat(form.elements["ph_lapangan"].value) || null,
      suhu_lapangan: parseFloat(form.elements["suhu_lapangan"].value) || null,
      catatan: form.elements["catatan"].value.trim(),
      tindak_lanjut: form.elements["tindak_lanjut"].value.trim()
    };

    // Handle file upload if present
    const fileInput = form.elements["lampiran_file"];
    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        const uploadRes = await SupabaseService.uploadDocument(fileInput.files[0], "lab_reports");
        samplingData.lampiran_url = uploadRes.url;
      } catch (uploadErr) {
        Notify.warning("Lampiran gagal diunggah, data tetap disimpan: " + uploadErr.message);
      }
    }

    try {
      const inserted = await SupabaseService.insert("ipal_sampling_records", samplingData);
      const samplingId = inserted[0].id;

      // Collect and save dynamic parameters
      const paramInputs = document.querySelectorAll(".param-value-input");
      const resultsToInsert = [];

      paramInputs.forEach(input => {
        const val = parseFloat(input.value);
        if (!isNaN(val)) {
          const paramId = input.dataset.paramId;
          const paramObj = this.parameters.find(p => p.id === paramId);
          let statusEvaluasi = "memenuhi";

          if (paramObj) {
            if (paramObj.operator_evaluasi === "range") {
              if (val < (paramObj.range_min || 6) || val > (paramObj.range_max || 9)) {
                statusEvaluasi = "melebihi";
              }
            } else {
              if (val > paramObj.baku_mutu_outlet) {
                statusEvaluasi = "melebihi";
              }
            }
          }

          resultsToInsert.push({
            sampling_id: samplingId,
            parameter_id: paramId,
            nilai_hasil: val,
            status_evaluasi: statusEvaluasi
          });
        }
      });

      if (resultsToInsert.length > 0) {
        await SupabaseService.insert("ipal_test_results", resultsToInsert);
      }

      Notify.success("Hasil uji IPAL berhasil disimpan dengan evaluasi baku mutu.");
      bootstrap.Modal.getInstance(document.getElementById("modal-ipal-sampling")).hide();
      await this.loadSamplingRecords();
      if (window.DashboardModule) DashboardModule.refresh();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan Sampel");
    }
  },

  async viewSamplingDetails(samplingId) {
    const s = this.samplingRecords.find(item => String(item.id) === String(samplingId));
    if (!s) return;

    let testResults = [];
    try {
      testResults = await SupabaseService.select("ipal_test_results", {
        eq: { sampling_id: samplingId }
      });
    } catch (err) {
      console.warn("Gagal memuat detail hasil uji:", err);
    }

    const modalBody = document.getElementById("sampling-details-body");
    if (!modalBody) return;

    let resultsRows = testResults.map(tr => {
      const p = this.parameters.find(param => param.id === tr.parameter_id) || {};
      return `
        <tr>
          <td><strong>${p.nama_parameter || tr.parameter_id}</strong></td>
          <td class="text-center font-monospace">${tr.nilai_hasil} ${p.satuan || ''}</td>
          <td class="text-center">${p.range_min ? p.range_min + ' - ' : '<= '}${p.baku_mutu_outlet || '-'} ${p.satuan || ''}</td>
          <td class="text-center">${Formatters.renderStatusBadge(tr.status_evaluasi)}</td>
        </tr>
      `;
    }).join("");

    if (!resultsRows) {
      resultsRows = `<tr><td colspan="4" class="text-center text-muted">Belum ada rincian parameter laboratorium.</td></tr>`;
    }

    modalBody.innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-6">
          <small class="text-muted d-block">Nomor Sampel</small>
          <strong>${s.no_sampel}</strong>
        </div>
        <div class="col-6">
          <small class="text-muted d-block">Tanggal Pengambilan</small>
          <strong>${Formatters.formatDateIndo(s.tanggal_sampling)}</strong>
        </div>
        <div class="col-6">
          <small class="text-muted d-block">Titik Sampling</small>
          <span class="badge ${s.titik_sampling === 'outlet' ? 'badge-soft-success' : 'badge-soft-warning'}">${s.titik_sampling.toUpperCase()}</span>
        </div>
        <div class="col-6">
          <small class="text-muted d-block">Laboratorium Penguji</small>
          <strong>${s.lab_penguji || "-"} (${s.no_laporan || "-"})</strong>
        </div>
      </div>
      <h6 class="fw-bold border-bottom pb-2 mt-4">Parameter dan Evaluasi Baku Mutu (PermenLHK P.68/2016)</h6>
      <div class="table-responsive">
        <table class="table table-sm table-bordered">
          <thead class="table-light">
            <tr>
              <th>Parameter</th>
              <th class="text-center">Nilai Hasil</th>
              <th class="text-center">Baku Mutu Outlet</th>
              <th class="text-center">Status Evaluasi</th>
            </tr>
          </thead>
          <tbody>
            ${resultsRows}
          </tbody>
        </table>
      </div>
      ${s.catatan ? `<div class="alert alert-light border mt-2 py-2 small"><strong>Catatan:</strong> ${s.catatan}</div>` : ""}
      ${s.lampiran_url ? `<div class="mt-2"><a href="${s.lampiran_url}" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-file-earmark-pdf me-1"></i>Buka Lampiran Sertifikat Lab</a></div>` : ""}
    `;

    new bootstrap.Modal(document.getElementById("modal-sampling-details")).show();
  },

  // ==========================================================================
  // 3. PEMANTAUAN IPAL & GRAFIK
  // ==========================================================================
  renderMonitoringChart() {
    const canvas = document.getElementById("chart-ipal-trend");
    if (!canvas || !window.Chart) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const records = [...this.flowRecords].reverse().slice(-14);
    const labels = records.map(r => Formatters.formatDateShort(r.tanggal));
    const volumes = records.map(r => r.volume);

    this.chartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels.length ? labels : ["Tidak ada data"],
        datasets: [{
          label: "Debit Air Limbah Harian (m³)",
          data: volumes.length ? volumes : [0],
          borderColor: "#059669",
          backgroundColor: "rgba(5, 150, 105, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#059669"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Volume (m³)" }
          }
        }
      }
    });
  },

  // ==========================================================================
  // 4. PEMELIHARAAN IPAL
  // ==========================================================================
  async loadMaintenanceRecords() {
    try {
      this.maintenanceRecords = await SupabaseService.select("ipal_maintenance_records", {
        order: { column: "tanggal", ascending: false }
      });
      this.renderMaintenanceTable();
    } catch (err) {
      console.error("Gagal memuat catatan pemeliharaan:", err);
    }
  },

  renderMaintenanceTable() {
    const tbody = document.getElementById("tbody-ipal-maintenance");
    if (!tbody) return;

    if (!this.maintenanceRecords.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada catatan pemeliharaan unit IPAL.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.maintenanceRecords.map((m, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${Formatters.formatDateIndo(m.tanggal)}</strong></td>
        <td><span class="badge badge-soft-info">${m.komponen}</span></td>
        <td><strong>${m.pekerjaan}</strong><br><small class="text-muted">Kondisi: ${m.kondisi_unit}</small></td>
        <td>${m.petugas}</td>
        <td>${m.tindak_lanjut || "-"}</td>
        <td class="text-center">
          <span class="badge ${m.status === 'selesai' ? 'badge-soft-success' : 'badge-soft-warning'}">
            ${m.status === 'selesai' ? 'Selesai' : 'Perlu Tindak Lanjut'}
          </span>
        </td>
      </tr>
    `).join("");
  },

  openMaintenanceModal() {
    const modalEl = document.getElementById("modal-ipal-maintenance");
    if (!modalEl) return;
    const form = document.getElementById("form-ipal-maintenance");
    form.reset();

    form.elements["tanggal"].value = new Date().toISOString().slice(0, 10);
    form.elements["waktu"].value = new Date().toTimeString().slice(0, 5);
    form.elements["petugas"].value = window.APP_CONFIG.CLINIC.penanggung_jawab_sanitarian;

    new bootstrap.Modal(modalEl).show();
  },

  async saveMaintenanceRecord(e) {
    e.preventDefault();
    const form = e.target;

    const data = {
      tanggal: form.elements["tanggal"].value,
      waktu: form.elements["waktu"].value,
      komponen: form.elements["komponen"].value.trim(),
      pekerjaan: form.elements["pekerjaan"].value.trim(),
      kondisi_unit: form.elements["kondisi_unit"].value.trim(),
      petugas: form.elements["petugas"].value.trim(),
      tindak_lanjut: form.elements["tindak_lanjut"].value.trim(),
      status: form.elements["status"].value
    };

    try {
      await SupabaseService.insert("ipal_maintenance_records", data);
      Notify.success("Catatan pemeliharaan IPAL berhasil disimpan.");
      bootstrap.Modal.getInstance(document.getElementById("modal-ipal-maintenance")).hide();
      await this.loadMaintenanceRecords();
    } catch (err) {
      Notify.error(err.message, "Gagal Menyimpan");
    }
  }
};

window.IpalModule = IpalModule;
