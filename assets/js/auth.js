/**
 * Authentication & Session Management
 * Klinik Asy-Syifa Environmental Management System
 */

const Auth = {
  user: null,

  async init() {
    await SupabaseService.init();

    const defaultUser = {
      id: "admin-asysyifa",
      email: "sanitarian@klinik-asysyifa.com",
      user_metadata: {
        full_name: "Siti Rahmawati, S.Tr.Kes (Sanitarian)",
        role: "admin"
      }
    };

    // Gunakan user yang sudah disimpan jika ada, atau default
    const savedUser = localStorage.getItem("asyifa_mock_user");
    const activeUser = savedUser ? JSON.parse(savedUser) : defaultUser;

    this.setUser(activeUser);
    SupabaseService.currentUser = activeUser;
    return true;
  },

  setUser(user) {
    this.user = user;
    const userDisplay = document.getElementById("auth-user-display");
    const userRoleBadge = document.getElementById("auth-role-badge");

    if (userDisplay) {
      userDisplay.textContent = user?.user_metadata?.full_name || "Petugas Sanitarian";
    }
    if (userRoleBadge) {
      userRoleBadge.textContent = "AKSES AKTIF";
      userRoleBadge.className = "badge bg-success text-white ms-1";
    }
  },

  isAuthenticated() {
    return true;
  },

  requireAuth() {
    return true;
  },

  showLoginModal() {
    // Tidak digunakan — akses langsung tanpa login
  },

  async handleLogout() {
    const confirmed = await Notify.confirm("Apakah Anda yakin ingin keluar dari sistem?", "Konfirmasi Logout");
    if (!confirmed) return;

    try {
      localStorage.removeItem("asyifa_mock_user");
      SupabaseService.currentUser = null;
      Notify.info("Anda telah keluar dari sesi kerja.", "Logout Berhasil");
    } catch (err) {
      Notify.error(err.message, "Gagal Logout");
    }
  }
};

window.Auth = Auth;
