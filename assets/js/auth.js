/**
 * Authentication & Session Management
 * Klinik Asy-Syifa Environmental Management System
 */

const Auth = {
  user: null,

  async init() {
    await SupabaseService.init();
    
    // Default active user for seamless instant access
    const defaultUser = {
      id: "admin-asysyifa",
      email: "sanitarian@klinik-asysyifa.com",
      user_metadata: {
        full_name: "Siti Rahmawati, S.Tr.Kes (Sanitarian)",
        role: "admin"
      }
    };

    // Use existing session if any, otherwise default user
    let activeUser = defaultUser;
    if (SupabaseService.isLive && SupabaseService.client) {
      try {
        const session = await SupabaseService.getSession();
        if (session && session.user) {
          activeUser = session.user;
        }
      } catch (e) {
        // Fallback to default
      }
    }

    this.setUser(activeUser);
    SupabaseService.currentUser = activeUser;
    return true;
  },

  setUser(user) {
    this.user = user;
    const userDisplay = document.getElementById("auth-user-display");
    const userRoleBadge = document.getElementById("auth-role-badge");

    if (userDisplay) {
      userDisplay.textContent = user.user_metadata?.full_name || "Petugas Sanitarian";
    }
    if (userRoleBadge) {
      userRoleBadge.textContent = "AKSES AKTIF";
      userRoleBadge.className = "badge bg-success text-white ms-1";
    }
  },

  isAuthenticated() {
    return true; // Bypass authentication so user enters directly
  },

  requireAuth() {
    return true;
  },

  showLoginModal() {
    // Login modal disabled for smooth testing
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
      let msg = err.message || "Gagal masuk ke sistem.";
      if (msg.toLowerCase().includes("invalid login credentials")) {
        msg = "Email atau password tidak sesuai, atau akun belum dibuat di Supabase Auth. Pastikan Anda telah membuat akun di Supabase Dashboard (Authentication -> Users -> Create User) dengan opsi 'Auto Confirm User' aktif, atau klik tab 'Daftar Akun' di atas.";
      }
      Notify.error(msg, "Autentikasi Gagal");
      return false;
    } finally {
      const btn = document.getElementById("btn-submit-login");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i>Masuk ke Sistem`;
      }
    }
  },

  async handleRegister(fullName, email, password) {
    try {
      const btn = document.getElementById("btn-submit-register");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Mendaftarkan...`;
      }

      const res = await SupabaseService.signUp(email, password, fullName);

      if (res.session && res.user) {
        this.setUser(res.user);
        Notify.success("Akun berhasil didaftarkan dan Anda langsung masuk!", "Pendaftaran Sukses");
        if (window.App && typeof window.App.navigate === "function") {
          window.App.navigate("dashboard");
        }
      } else {
        Notify.info(
          "Akun berhasil dibuat di Supabase Auth. Jika email konfirmasi diaktifkan di Supabase, silakan periksa email Anda atau aktifkan opsi 'Auto Confirm User' pada dashboard Supabase.",
          "Akun Terdaftar"
        );
      }
      return true;
    } catch (err) {
      Notify.error(err.message, "Pendaftaran Gagal");
      return false;
    } finally {
      const btn = document.getElementById("btn-submit-register");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-person-plus me-2"></i>Daftarkan Akun Petugas`;
      }
    }
  },

  enableDemoMode() {
    localStorage.removeItem("asyifa_supabase_url");
    localStorage.removeItem("asyifa_supabase_anon_key");
    const mockUser = {
      id: "mock-admin",
      email: "admin@klinik-asysyifa.com",
      user_metadata: { full_name: "Admin Sanitarian Asy-Syifa", role: "admin" }
    };
    localStorage.setItem("asyifa_mock_user", JSON.stringify(mockUser));
    Notify.info("Beralih ke Mode Demo Lokal. Memuat ulang halaman...");
    setTimeout(() => {
      window.location.reload();
    }, 800);
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
