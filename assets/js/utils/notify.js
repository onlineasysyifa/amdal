/**
 * Toast and Alert Notifications
 * Klinik Asy-Syifa Environmental Management System
 */

const Notify = {
  containerId: "toast-container-global",

  init() {
    if (!document.getElementById(this.containerId)) {
      const container = document.createElement("div");
      container.id = this.containerId;
      container.className = "toast-container position-fixed bottom-0 end-0 p-3";
      container.style.zIndex = "1100";
      document.body.appendChild(container);
    }
  },

  show(message, type = "info", title = "Pemberitahuan") {
    this.init();
    const container = document.getElementById(this.containerId);
    const toastId = "toast-" + Date.now() + Math.random().toString(36).substring(2, 6);

    let bgClass = "bg-primary text-white";
    let icon = "bi-info-circle";

    if (type === "success") {
      bgClass = "bg-success text-white";
      icon = "bi-check-circle";
    } else if (type === "danger" || type === "error") {
      bgClass = "bg-danger text-white";
      icon = "bi-exclamation-triangle";
    } else if (type === "warning") {
      bgClass = "bg-warning text-dark";
      icon = "bi-exclamation-circle";
    }

    const toastHtml = `
      <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg mb-2" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <i class="bi ${icon} fs-5"></i>
            <div>
              <strong>${title}:</strong> ${message}
            </div>
          </div>
          <button type="button" class="btn-close ${type === 'warning' ? '' : 'btn-close-white'} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML("beforeend", toastHtml);
    const el = document.getElementById(toastId);
    if (window.bootstrap && bootstrap.Toast) {
      const toast = new bootstrap.Toast(el, { delay: 4000 });
      toast.show();
      el.addEventListener("hidden.bs.toast", () => el.remove());
    } else {
      setTimeout(() => el.remove(), 4000);
    }
  },

  success(msg, title = "Sukses") {
    this.show(msg, "success", title);
  },

  error(msg, title = "Kesalahan") {
    this.show(msg, "danger", title);
  },

  warning(msg, title = "Peringatan") {
    this.show(msg, "warning", title);
  },

  info(msg, title = "Informasi") {
    this.show(msg, "info", title);
  },

  // Asynchronous Confirmation Dialog
  async confirm(message, title = "Konfirmasi Tindakan") {
    return new Promise((resolve) => {
      const modalId = "modal-confirm-" + Date.now();
      const modalHtml = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow border-0">
              <div class="modal-header bg-light">
                <h5 class="modal-title fs-6 fw-bold"><i class="bi bi-question-circle text-primary me-2"></i>${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body py-4">
                <p class="mb-0 text-secondary">${message}</p>
              </div>
              <div class="modal-footer bg-light py-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal" id="${modalId}-cancel">Batal</button>
                <button type="button" class="btn btn-sm btn-primary" id="${modalId}-ok">Ya, Lanjutkan</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHtml);
      const modalEl = document.getElementById(modalId);
      const bsModal = new bootstrap.Modal(modalEl);

      const cleanup = () => {
        bsModal.hide();
        setTimeout(() => modalEl.remove(), 400);
      };

      document.getElementById(`${modalId}-ok`).addEventListener("click", () => {
        cleanup();
        resolve(true);
      });

      document.getElementById(`${modalId}-cancel`).addEventListener("click", () => {
        cleanup();
        resolve(false);
      });

      modalEl.addEventListener("hidden.bs.modal", () => {
        modalEl.remove();
        resolve(false);
      });

      bsModal.show();
    });
  }
};

window.Notify = Notify;
