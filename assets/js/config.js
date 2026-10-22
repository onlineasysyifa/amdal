/**
 * SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
 * Konfigurasi Aplikasi
 *
 * Data disimpan via JSON lokal (folder /data/) + localStorage untuk perubahan user.
 * Tidak menggunakan koneksi Supabase.
 */

window.APP_CONFIG = {
  STORAGE_BUCKET: "clinic-documents",

  CLINIC: {
    nama: "Klinik Pratama Asy-Syifa",
    nomor_izin: "445/012/DPMPTSP/2023",
    alamat: "Jl. Asy-Syifa No. 07, Sukamaju, Jawa Barat",
    telepon: "(021) 87654321",
    email: "info@klinik-asysyifa.com",
    kepala_klinik: "dr. H. Ahmad Fauzi, Sp.PK",
    penanggung_jawab_sanitarian: "Siti Rahmawati, S.Tr.Kes",
    nip_sanitarian: "19920815 202012 2 004"
  }
};

// Override profil klinik jika ada yang sudah disimpan user sebelumnya
(function () {
  const saved = localStorage.getItem("asyifa_clinic_profile");
  if (saved) {
    try {
      window.APP_CONFIG.CLINIC = JSON.parse(saved);
    } catch {}
  }
})();
