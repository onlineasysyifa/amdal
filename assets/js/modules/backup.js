/**
 * Modul Backup, Restore & Audit Log Viewer
 * Klinik Asy-Syifa Environmental Management System
 */

const BackupModule = {
  auditLogs: [],

  async init() {
    await this.loadAuditLogs();
  },

  // 1. AUDIT LOGS
  async loadAuditLogs() {
    try {
      this.auditLogs = await SupabaseService.select("audit_logs", {
        order: { column: "created_at", ascending: false },
        limit: 100
      });
      this.renderAuditLogsTable();
    } catch (err) {
      console.warn("Gagal memuat log audit:", err);
    }
  },

  renderAuditLogsTable() {
    const tbody = document.getElementById("tbody-audit-logs");
    if (!tbody) return;

    if (!this.auditLogs.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Belum ada riwayat aktivitas sistem tercatat.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.auditLogs.map((log, idx) => {
      let actionBadge = "badge-soft-secondary";
      if (log.action === "LOGIN" || log.action === "LOGOUT") actionBadge = "badge-soft-info";
      else if (log.action === "INSERT") actionBadge = "badge-soft-success";
      else if (log.action === "UPDATE") actionBadge = "badge-soft-warning";
      else if (log.action === "DELETE") actionBadge = "badge-soft-danger";

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${Formatters.formatDateTimeIndo(log.created_at)}</td>
          <td><span class="badge ${actionBadge}">${log.action}</span></td>
          <td><code>${log.entity}</code></td>
          <td><small class="font-monospace text-muted">${log.record_id || '-'}</small></td>
          <td>
            <small class="text-truncate d-inline-block" style="max-width: 250px;" title='${JSON.stringify(log.new_data || log.old_data || {})}'>
              ${log.new_data ? JSON.stringify(log.new_data) : (log.old_data ? JSON.stringify(log.old_data) : '-')}
            </small>
          </td>
        </tr>
      `;
    }).join("");
  },

  // 2. EXPORT BACKUP JSON
  async exportFullBackup() {
    try {
      Notify.info("Mempersiapkan data backup...");

      const backupData = {
        meta: {
          app: "Sistem Informasi IPAL & Limbah B3 Klinik Asy-Syifa",
          exported_at: new Date().toISOString(),
          version: "2.0.0"
        },
        clinic_profile: window.APP_CONFIG.CLINIC,
        rooms: MastersModule.rooms,
        waste_types: MastersModule.wasteTypes,
        transporters: MastersModule.transporters,
        ipal_parameters: IpalModule.parameters,
        ipal_flow_records: IpalModule.flowRecords,
        ipal_sampling_records: IpalModule.samplingRecords,
        ipal_maintenance_records: IpalModule.maintenanceRecords,
        waste_collections: WasteModule.collections,
        waste_collection_items: WasteModule.collectionItems,
        tps_receipts: WasteModule.receipts,
        tps_receipt_items: WasteModule.receiptItems,
        waste_transports: WasteModule.transports,
        waste_transport_items: WasteModule.transportItems,
        tps_adjustments: WasteModule.adjustments,
        tps_inspections: InspectionsModule.inspections,
        corrective_actions: InspectionsModule.correctiveActions
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_asysyifa_ipal_b3_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await SupabaseService.recordAuditLog("BACKUP", "system", "full_backup", null, { time: new Date().toISOString() });
      Notify.success("Cadangan data lengkap berhasil diunduh.");
    } catch (err) {
      Notify.error(err.message, "Gagal Melakukan Backup");
    }
  },

  // 3. RESTORE FROM JSON
  async importBackup(file) {
    if (!file) return;

    const ok = await Notify.confirm(
      "Apakah Anda yakin ingin memulihkan data dari berkas cadangan ini? Data lokal yang ada akan diperbarui.",
      "Konfirmasi Pemulihan (Restore)"
    );
    if (!ok) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.meta || !data.meta.app.includes("Asy-Syifa")) {
          throw new Error("Format berkas backup tidak valid atau tidak dikenali.");
        }

        // Restore to local storage
        if (data.rooms) localStorage.setItem("asyifa_rooms", JSON.stringify(data.rooms));
        if (data.waste_types) localStorage.setItem("asyifa_waste_types", JSON.stringify(data.waste_types));
        if (data.transporters) localStorage.setItem("asyifa_transporters", JSON.stringify(data.transporters));
        if (data.ipal_flow_records) localStorage.setItem("asyifa_ipal_flow_records", JSON.stringify(data.ipal_flow_records));
        if (data.ipal_sampling_records) localStorage.setItem("asyifa_ipal_sampling_records", JSON.stringify(data.ipal_sampling_records));
        if (data.waste_collections) localStorage.setItem("asyifa_waste_collections", JSON.stringify(data.waste_collections));
        if (data.waste_collection_items) localStorage.setItem("asyifa_waste_collection_items", JSON.stringify(data.waste_collection_items));
        if (data.tps_receipts) localStorage.setItem("asyifa_tps_receipts", JSON.stringify(data.tps_receipts));
        if (data.tps_receipt_items) localStorage.setItem("asyifa_tps_receipt_items", JSON.stringify(data.tps_receipt_items));
        if (data.waste_transports) localStorage.setItem("asyifa_waste_transports", JSON.stringify(data.waste_transports));
        if (data.waste_transport_items) localStorage.setItem("asyifa_waste_transport_items", JSON.stringify(data.waste_transport_items));

        Notify.success("Data berhasil dipulihkan dari cadangan. Memuat ulang aplikasi...", "Pemulihan Sukses");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err) {
        Notify.error(err.message, "Gagal Membaca File Cadangan");
      }
    };
    reader.readAsText(file);
  }
};

window.BackupModule = BackupModule;
