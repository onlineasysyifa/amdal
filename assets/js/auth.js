/**
 * Authentication & Session Management
 * Klinik Asy-Syifa Environmental Management System
 */

const Auth = {
  user: null,

  async init() {
    SupabaseService.init();
    const session = await SupabaseService.getSession();
    if (session && session.user) {
      this.setUser(session.user);
      return true;
    } else {
      this.setUser(null);
      return false;
    }
  },

  setUser(user) {
    this.user = user;
    const userDisplay = document.getElementById("auth-user-display");
    const userRoleBadge = document.getElementById("auth-role-badge");
    const loginBtn = document.getElementById("btn-login-nav");
    const logoutBtn = document.getElementById("btn-logout-nav");

    if (user) {
      const email = user.email || "Petugas";
      const name = user.user_metadata?.full_name || email.split("@")[0];
      const role = user.user_metadata?.role || "petugas";

      if (userDisplay) userDisplay.textContent = name;
      if (userRoleBadge) {
        userRoleBadge.textContent = role.toUpperCase();
        userRoleBadge.className = `badge ${role === 'admin' ? 'bg-danger' : 'bg-success'} text-white ms-2`;
      }
      if (loginBtn) loginBtn.classList.add("d-none");
      if (logoutBtn) logoutBtn.classList.remove("d-none");

      // Hide login overlay if open
      const loginModalEl = document.getElementById("modal-login");
      if (loginModalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(loginModalEl);
        if (modal) modal.hide();
      }
    } else {
      if (userDisplay) userDisplay.textContent = "Tamu (Belum Login)";
      if (userRoleBadge) {
        userRoleBadge.textContent = "ANONIM";
        userRoleBadge.className = "badge bg-secondary text-white ms-2";
      }
      if (loginBtn) loginBtn.classList.remove("d-none");
      if (logoutBtn) logoutBtn.classList.add("d-none");
    }
  },

  isAuthenticated() {
    return !!this.user;
  },

  requireAuth() {
    if (!this.isAuthenticated()) {
      this.showLoginModal();
      return false;
    }
    return true;
  },

  showLoginModal() {
    const modalEl = document.getElementById("modal-login");
    if (modalEl && window.bootstrap) {
      const modal = new bootstrap.Modal(modalEl, { backdrop: "static", keyboard: false });
      modal.show();
    }
  },

  async handleLogin(email, password) {
    try {
      const btn = document.getElementById("btn-submit-login");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Memproses...`;
      }

      const res = await SupabaseService.login(email, password);
      this.setUser(res.user);
      Notify.success("Selamat datang! Anda berhasil masuk.", "Login Berhasil");
      
      // Refresh current view
      if (window.App && typeof window.App.navigate === "function") {
        window.App.navigate(window.location.hash.slice(1) || "dashboard");
      }
      return true;
    } catch (err) {
      Notify.error(err.message || "Gagal masuk ke sistem.", "Autentikasi Gagal");
      return false;
    } finally {
      const btn = document.getElementById("btn-submit-login");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>Masuk ke Sistem`;
      }
    }
  },

  async handleLogout() {
    const confirmed = await Notify.confirm("Apakah Anda yakin ingin keluar dari sistem?", "Konfirmasi Logout");
    if (!confirmed) return;

    try {
      await SupabaseService.logout();
      this.setUser(null);
      Notify.info("Anda telah keluar dari sesi kerja.", "Logout Berhasil");
      this.showLoginModal();
    } catch (err) {
      Notify.error(err.message, "Gagal Logout");
    }
  },

  async handleResetPassword(email) {
    if (!email) {
      Notify.warning("Masukkan alamat email yang terdaftar!");
      return;
    }
    try {
      await SupabaseService.resetPassword(email);
      Notify.success("Instruksi pemulihan kata sandi telah dikirim ke email: " + email, "Email Terkirim");
    } catch (err) {
      Notify.error(err.message, "Gagal Mengirim Email");
    }
  }
};

window.Auth = Auth;
