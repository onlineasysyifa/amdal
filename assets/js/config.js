/**
 * SISTEM INFORMASI PENGELOLAAN IPAL DAN LIMBAH B3 KLINIK ASY-SYIFA
 * Konfigurasi Supabase dan Pengaturan Global Aplikasi
 * 
 * CATATAN KEAMANAN:
 * - HANYA masukkan SUPABASE_URL dan SUPABASE_ANON_KEY (Publishable Key).
 * - JANGAN PERNAH memasukkan service_role key, database password, atau secret key!
 */

const DEFAULT_CONFIG = {
  // Ganti placeholder di bawah ini dengan kredensial Supabase Project Anda,
  // atau simpan langsung melalui menu "Pengaturan Aplikasi" di UI.
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-anon-key",
  
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

// Check if credentials are stored in localStorage
function getAppConfig() {
  const savedUrl = localStorage.getItem("asyifa_supabase_url");
  const savedKey = localStorage.getItem("asyifa_supabase_anon_key");
  
  return {
    SUPABASE_URL: savedUrl || window.ENV?.SUPABASE_URL || DEFAULT_CONFIG.SUPABASE_URL,
    SUPABASE_ANON_KEY: savedKey || window.ENV?.SUPABASE_ANON_KEY || DEFAULT_CONFIG.SUPABASE_ANON_KEY,
    STORAGE_BUCKET: DEFAULT_CONFIG.STORAGE_BUCKET,
    CLINIC: DEFAULT_CONFIG.CLINIC
  };
}

window.APP_CONFIG = getAppConfig();
