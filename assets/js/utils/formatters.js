/**
 * Formatters and Data Display Utilities
 * Klinik Asy-Syifa Environmental Management System
 */

const Formatters = {
  // Format Date to Indonesian long format: "22 Oktober 2026"
  formatDateIndo(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  // Format Date to short: "22/10/2026"
  formatDateShort(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  },

  // Format Time: "08:30"
  formatTime(timeStr) {
    if (!timeStr) return "-";
    return String(timeStr).substring(0, 5);
  },

  // Format Datetime: "22 Okt 2026, 08:30 WIB"
  formatDateTimeIndo(datetimeStr) {
    if (!datetimeStr) return "-";
    const d = new Date(datetimeStr);
    if (isNaN(d.getTime())) return datetimeStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${mins} WIB`;
  },

  // Format Number with Indonesian thousand separator
  formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return Number(num).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  },

  // Format Quantity with Unit
  formatQtyWithUnit(qty, unit = "kg") {
    return `${this.formatNumber(qty)} ${unit}`;
  },

  // Status Badge for Waste Collection & TPS Receipts
  renderStatusBadge(status) {
    switch (status) {
      case "pending_tps":
        return `<span class="badge badge-soft-warning"><i class="bi bi-clock me-1"></i>Menunggu TPS</span>`;
      case "diterima_sebagian":
        return `<span class="badge badge-soft-info"><i class="bi bi-pie-chart me-1"></i>Diterima Sebagian</span>`;
      case "diterima_penuh":
      case "confirmed":
        return `<span class="badge badge-soft-success"><i class="bi bi-check-circle me-1"></i>Dikonfirmasi</span>`;
      case "dibatalkan":
        return `<span class="badge badge-soft-danger"><i class="bi bi-x-circle me-1"></i>Dibatalkan</span>`;
      case "memenuhi":
        return `<span class="badge badge-soft-success"><i class="bi bi-check2 me-1"></i>Memenuhi Baku Mutu</span>`;
      case "melebihi":
        return `<span class="badge badge-soft-danger"><i class="bi bi-exclamation-triangle me-1"></i>Melebihi Baku Mutu</span>`;
      case "layak":
        return `<span class="badge badge-soft-success">Layak Operasional</span>`;
      case "perlu_perbaikan":
        return `<span class="badge badge-soft-warning">Perlu Perbaikan</span>`;
      case "tidak_layak":
        return `<span class="badge badge-soft-danger">Tidak Layak</span>`;
      case "open":
        return `<span class="badge badge-soft-danger">Terbuka (Open)</span>`;
      case "in_progress":
        return `<span class="badge badge-soft-warning">Dalam Proses</span>`;
      case "resolved":
        return `<span class="badge badge-soft-success">Selesai (Resolved)</span>`;
      case "lengkap":
        return `<span class="badge badge-soft-success">Dokumen Lengkap</span>`;
      case "menunggu_bast":
        return `<span class="badge badge-soft-warning">Menunggu BAST</span>`;
      case "menunggu_sertifikat":
        return `<span class="badge badge-soft-info">Menunggu Sertifikat</span>`;
      default:
        return `<span class="badge badge-soft-secondary">${status || "-"}</span>`;
    }
  },

  // Stock Days in Storage Badge
  renderStorageAgeBadge(days, maxDays = 90) {
    if (days <= 0) return `<span class="badge badge-soft-secondary">Kosong</span>`;
    if (days > maxDays) {
      return `<span class="badge badge-soft-danger stock-status-danger"><i class="bi bi-exclamation-octagon me-1"></i>${days} Hari (Melebihi Batas)</span>`;
    } else if (days >= (maxDays - 14)) {
      return `<span class="badge badge-soft-warning stock-status-warning"><i class="bi bi-exclamation-triangle me-1"></i>${days} Hari (Mendekati Batas)</span>`;
    } else {
      return `<span class="badge badge-soft-success stock-status-safe"><i class="bi bi-shield-check me-1"></i>${days} Hari (Aman)</span>`;
    }
  }
};

window.Formatters = Formatters;
