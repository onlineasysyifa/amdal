/**
 * Export and Print Utilities (CSV & A4 Print Engine)
 * Klinik Asy-Syifa Environmental Management System
 */

const Exporter = {
  // Export array of objects / 2D array to CSV file with UTF-8 BOM
  exportToCsv(filename, headers, rows) {
    if (!rows || !rows.length) {
      Notify.warning("Tidak ada data untuk diekspor!");
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel compatibility

    // Add headers
    csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(";") + "\r\n";

    // Add rows
    rows.forEach(row => {
      const line = row.map(val => {
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(";");
      csvContent += line + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    Notify.success(`Data berhasil diekspor ke file CSV: ${filename}.csv`);
  },

  // Generate formal Klinik Asy-Syifa letterhead for A4 print
  renderClinicLetterhead() {
    const clinic = window.APP_CONFIG.CLINIC;
    return `
      <div class="kop-surat">
        <img src="assets/img/logo.svg" alt="Logo Klinik" class="kop-logo">
        <div class="kop-text">
          <h2>KLINIK PRATAMA ASY-SYIFA</h2>
          <h3>UNIT PENGELOLAAN LINGKUNGAN & K3</h3>
          <p>Izin Operasional No: ${clinic.nomor_izin} | Telp: ${clinic.telepon}</p>
          <p>${clinic.alamat} | Email: ${clinic.email}</p>
        </div>
      </div>
    `;
  },

  // Generate signature block
  renderSignatureBlock(reportDate = new Date()) {
    const clinic = window.APP_CONFIG.CLINIC;
    const formattedDate = Formatters.formatDateIndo(reportDate);
    return `
      <div class="signature-block">
        <div class="signature-box">
          <p class="mb-1">Mengetahui,</p>
          <p class="mb-0 fw-bold">Penanggung Jawab Klinik</p>
          <div class="signature-space"></div>
          <p class="signature-name">${clinic.kepala_klinik}</p>
          <p class="signature-nip">Penanggung Jawab Medis</p>
        </div>
        <div class="signature-box">
          <p class="mb-1">Sukamaju, ${formattedDate}</p>
          <p class="mb-0 fw-bold">Petugas Sanitarian Lingkungan</p>
          <div class="signature-space"></div>
          <p class="signature-name">${clinic.penanggung_jawab_sanitarian}</p>
          <p class="signature-nip">NIP: ${clinic.nip_sanitarian}</p>
        </div>
      </div>
    `;
  },

  // Open A4 Print Preview
  openPrintPreview(reportTitle, periodText, tableHtml, summaryHtml = "", chartImgSrc = "") {
    let printContainer = document.getElementById("print-preview-container");
    if (!printContainer) {
      printContainer = document.createElement("div");
      printContainer.id = "print-preview-container";
      printContainer.className = "print-only";
      document.body.appendChild(printContainer);
    }

    let chartBlock = "";
    if (chartImgSrc) {
      chartBlock = `
        <div class="chart-print-container">
          <img src="${chartImgSrc}" style="max-width: 90%; height: auto; border: 1px solid #ddd; padding: 4px;" alt="Grafik Laporan">
        </div>
      `;
    }

    printContainer.innerHTML = `
      ${this.renderClinicLetterhead()}
      <div class="report-header-title">
        <h4>${reportTitle}</h4>
        <p>Periode: ${periodText}</p>
      </div>
      ${summaryHtml ? `<div class="report-summary-box">${summaryHtml}</div>` : ""}
      ${chartBlock}
      <div class="table-responsive">
        ${tableHtml}
      </div>
      ${this.renderSignatureBlock()}
    `;

    // Trigger browser print
    window.print();
  }
};

window.Exporter = Exporter;
