export type Direktorat = 'Penuntutan' | 'Penindakan';

export type HubunganTahanan = 
  | 'Keluarga Inti'
  | 'Penasihat Hukum / Advokat'
  | 'Kerabat / Rekan Sejawat'
  | 'Atasan / Satuan Militer'
  | 'Rohaniwan'
  | 'Tim Medis';

export type StatusPermohonan = 'Diproses' | 'Disetujui' | 'Ditolak' | 'Selesai';

export type RoleAkun = 'Admin' | 'Staff' | 'Penuntut Umum Koneksitas' | 'Penyidik Koneksitas';

export interface AkunUser {
  id: string;
  nama: string;
  nip: string;
  tipeIdentitas?: 'NIP' | 'NRP';
  pangkat: string;
  jabatan: string;
  role: RoleAkun;
  direktorat: Direktorat;
  email: string;
  noHp: string;
  username?: string;
  password?: string;
  eSignEnabled: boolean;
  fotoTandaTangan?: string; // base64 or URL
}

export interface Tahanan {
  id: string;
  namaLengkap: string;
  direktorat: Direktorat;
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  kebangsaan: string;
  tempatTinggal: string;
  agama: string;
  pekerjaan: string;
  pendidikan: string;
  nik: string;
  tempatDitahan: string;
  // Legacy aliases for compatibility
  namaTahanan?: string;
  pangkatNrpTahanan?: string;
  satuanTahanan?: string;
  lokasiRutan?: string;
}

export interface PermohonanT10 {
  id: string;
  direktorat: Direktorat;
  nomorSurat: string; // Penuntutan: B-{n}/PM.3/PMpt.1/{mm}/{yyyy} | Penindakan: B-{n}/PM.3/PMpd.1/{mm}/{yyyy}
  nomorUrut: number;
  tahun: number;
  
  // Data Pemohon
  namaPemohon: string;
  nikPemohon: string;
  noWhatsApp: string;
  hubungan: HubunganTahanan;
  alamatPemohon?: string;
  pekerjaanPemohon?: string;
  fotoKTP?: string;
  
  // Data Tahanan
  namaTahanan: string;
  pangkatNrpTahanan: string;
  satuanTahanan: string;
  lokasiRutan: string;
  nomorPerkara?: string;
  
  // Detail Kunjungan
  tanggalKunjungan: string; // YYYY-MM-DD
  sesiKunjungan: 'Sesi Pagi (09.00 - 11.30 WIB)' | 'Sesi Siang (13.30 - 15.30 WIB)';
  keperluanKunjungan: string;
  jumlahPengunjung: number;
  namaPengikut?: string;
  
  // Status & Metadata
  status: StatusPermohonan;
  catatanPetugas?: string;
  namaPetugasPemeriksa?: string;
  penandatanganNama?: string;
  penandatanganPangkat?: string;
  penandatanganNip?: string;
  penandatanganTipeIdentitas?: 'NIP' | 'NRP';
  penandatanganJabatan?: string;
  penandatanganTtdUrl?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  
  // Status Integrasi
  syncedToGoogleSheets: boolean;
  sheetsRowIndex?: number;
  waNotifiedAdmin: boolean;
  waNotifiedPemohon: boolean;
}

export interface SystemSettings {
  googleAppsScriptUrl: string; // Penuntutan GAS
  spreadsheetUrl: string; // Penuntutan Sheet
  googleAppsScriptUrlPenindakan?: string; // Penindakan GAS
  spreadsheetUrlPenindakan?: string; // Penindakan Sheet
  googleDocTemplateUrl: string;
  waGatewayProvider: 'fonnte' | 'wablas' | 'ultramsg' | 'simulasi';
  waApiKey: string;
  waAdminPhone: string;
  autoSyncSheets: boolean;
  autoNotifyWa: boolean;
  pejabatNama: string;
  pejabatPangkat: string;
  pejabatNip: string;
  pejabatJabatan: string;
}

export interface NikValidationInfo {
  isValid: boolean;
  errorMessage?: string;
  province?: string;
  regency?: string;
  birthDate?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  is16Digits: boolean;
  isNumeric: boolean;
}

export interface CreatePermohonanInput {
  direktorat?: Direktorat;
  namaPemohon: string;
  nikPemohon: string;
  noWhatsApp: string;
  hubungan: HubunganTahanan;
  alamatPemohon?: string;
  pekerjaanPemohon?: string;
  fotoKTP?: string;
  namaTahanan: string;
  pangkatNrpTahanan: string;
  satuanTahanan: string;
  lokasiRutan: string;
  tanggalKunjungan: string;
  sesiKunjungan: 'Sesi Pagi (09.00 - 11.30 WIB)' | 'Sesi Siang (13.30 - 15.30 WIB)';
  keperluanKunjungan: string;
  jumlahPengunjung?: number;
  namaPengikut?: string;
}
