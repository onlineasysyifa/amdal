/**
 * Application Core, Hash Router & Global State Controller
 * Sistem Informasi IPAL & Limbah B3 Klinik Asy-Syifa
 */

const App = {
  currentView: "dashboard",

  async init() {
    console.log("Memulai Sistem Informasi IPAL & Limbah B3 Klinik Asy-Syifa...");

    // Initialize Auth & Session
    await Auth.init();

    // Bind navigation & hash change
    window.addEventListener("hashchange", () => this.handleHashChange());
    this.setupNavigation();
    this.setupGlobalForms();

    // Initial route
    this.handleHashChange();
  },

  handleHashChange() {
    let hash = window.location.hash.slice(1).replace(/^\//, "");
    if (!hash) hash = "dashboard";
    this.navigate(hash);
  },

  navigate(viewName) {
    this.currentView = viewName;

    // Check auth protection
    if (!Auth.isAuthenticated()) {
      Auth.showLoginModal();
      return;
    }

    // Hide all view sections
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("d-none"));

    // Highlight active link in sidebar
    document.querySelectorAll(".sidebar-nav .nav-link").forEach(link => {
      const href = link.getAttribute("href") || "";
      if (href.replace("#/", "") === viewName || href.replace("#", "") === viewName) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Show target section
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.remove("d-none");
      this.onViewActivated(viewName);
    } else {
      console.warn(`View '${viewName}' tidak ditemukan, kembali ke dashboard.`);
      this.navigate("dashboard");
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("show")) {
      sidebar.classList.remove("show");
      const backdrop = document.querySelector(".sidebar-backdrop");
      if (backdrop) backdrop.remove();
    }
  },

  onViewActivated(viewName) {
    switch (viewName) {
      case "dashboard":
        if (window.DashboardModule) DashboardModule.init();
        break;
      case "ipal":
        if (window.IpalModule) IpalModule.init();
        break;
      case "waste":
        if (window.WasteModule) WasteModule.init();
        break;
      case "rooms":
        if (window.MastersModule) MastersModule.loadRooms();
        break;
      case "waste-types":
        if (window.MastersModule) MastersModule.loadWasteTypes();
        break;
      case "transporters":
        if (window.MastersModule) MastersModule.loadTransporters();
        break;
      case "inspections":
        if (window.InspectionsModule) InspectionsModule.init();
        break;
      case "reports":
        if (window.ReportsModule) ReportsModule.init();
        break;
      case "settings":
        if (window.SettingsModule) SettingsModule.init();
        break;
      case "backup":
        if (window.BackupModule) BackupModule.init();
        break;
    }
  },

  setupNavigation() {
    // Mobile sidebar toggle button
    const btnToggle = document.getElementById("btn-toggle-sidebar");
    if (btnToggle) {
      btnToggle.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        sidebar.classList.toggle("show");

        let backdrop = document.querySelector(".sidebar-backdrop");
        if (sidebar.classList.contains("show")) {
          if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.className = "sidebar-backdrop";
            backdrop.addEventListener("click", () => {
              sidebar.classList.remove("show");
              backdrop.remove();
            });
            document.body.appendChild(backdrop);
          }
        } else if (backdrop) {
          backdrop.remove();
        }
      });
    }

    // Auth Logout button
    const btnLogoutNav = document.getElementById("btn-logout-nav");
    if (btnLogoutNav) {
      btnLogoutNav.addEventListener("click", () => Auth.handleLogout());
    }
  },

  setupGlobalForms() {
    // Search inputs on master data tables
    this.bindSearchInput("search-rooms", term => MastersModule.renderRoomsTable(term));
    this.bindSearchInput("search-waste-types", term => MastersModule.renderWasteTypesTable(term));
    this.bindSearchInput("search-transporters", term => MastersModule.renderTransportersTable(term));
  },

  bindSearchInput(inputId, callback) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.addEventListener("input", (e) => {
      callback(e.target.value.trim());
    });
  }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
