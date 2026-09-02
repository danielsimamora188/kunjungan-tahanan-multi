# Walkthrough: Pemisahan Modul Direktorat Penuntutan & Direktorat Penindakan

Pemisahan modul, registrasi surat T-10, database, role pengguna, dan integrasi Google Spreadsheet telah berhasil diselesaikan secara komprehensif.

---

## 1. Pemisahan Format Registrasi Surat T-10

- **Direktorat Penuntutan**:
  - Penomoran Dokumen: `Nomor: B-{n}/PM.3/PMpt.1/{bulan}/{tahun}`
  - Disahkan Oleh: `An. Direktur Penuntutan`, `Selaku Penuntut Umum Koneksitas`
  - Tembusan 1: `Yth. Direktur Penuntutan (sebagai laporan)`
- **Direktorat Penindakan**:
  - Penomoran Dokumen: `Nomor: B-{n}/PM.3/PMpd.1/{bulan}/{tahun}`
  - Disahkan Oleh: `An. Direktur Penindakan`, `Selaku Penyidik Koneksitas`
  - Tembusan 1: `Yth. Direktur Penindakan (sebagai laporan)`

---

## 2. Pemisahan Role & Akun Pengguna

| Role | Direktorat | Akses |
|---|---|---|
| **Admin** | Penuntutan & Penindakan | Dashboard, Data Kunjungan, Data Tahanan, Akun & E-Sign, Pengaturan Spreadsheet & WA Gateway |
| **Staff** | Penuntutan / Penindakan | Dashboard (View), Data Kunjungan, Data Tahanan |
| **Penuntut Umum Koneksitas** | Penuntutan | Dashboard (Verifikasi, Disposisi & E-Sign Dokumen T-10 Penuntutan) |
| **Penyidik Koneksitas** | Penindakan | Dashboard (Verifikasi, Disposisi & E-Sign Dokumen T-10 Penindakan) |

---

## 3. Halaman Publik & Pelacakan Terpisah

- [Landing Page](file:///c:/Users/gilbe/OneDrive/Desktop/Daniel/Kunjungan-Tahanan/src/components/LandingPage.tsx): Kartu visual terpisah untuk memilih **Direktorat Penuntutan** atau **Direktorat Penindakan**.
- [Header & Navigasi](file:///c:/Users/gilbe/OneDrive/Desktop/Daniel/Kunjungan-Tahanan/src/components/Header.tsx): Dropdown menu untuk mengakses langsung:
  - `/penuntutan/formulir` & `/penuntutan/lacak`
  - `/penindakan/formulir` & `/penindakan/lacak`
- [PublicForm](file:///c:/Users/gilbe/OneDrive/Desktop/Daniel/Kunjungan-Tahanan/src/components/PublicForm.tsx): Mengambil data tahanan hanya sesuai direktorat yang dipilih dan membuat nomor registrasi yang tepat.
- [TrackingView](file:///c:/Users/gilbe/OneDrive/Desktop/Daniel/Kunjungan-Tahanan/src/components/TrackingView.tsx): Pelacakan permohonan dengan indikator identitas direktorat.

---

## 4. Database & Integrasi Spreadsheet Terpisah

- **Google Spreadsheet Penuntutan**: Webhook GAS mandiri untuk sinkronisasi data permohonan, tahanan, dan akun Penuntutan.
- **Google Spreadsheet Penindakan**: Webhook GAS mandiri untuk sinkronisasi data permohonan, tahanan, dan akun Penindakan.
- **UI Admin Dashboard Modal Pengaturan**: Dilengkapi form URL Google Spreadsheet dan Webhook GAS terpisah untuk masing-masing direktorat beserta tombol pengujian (*Test Connection*).

---

## 5. Verifikasi & Pengujian

- Kompilasi `npm run build` berhasil 100% tanpa error TypeScript maupun bundling.
- Server Express + Vite aktif di port `3001`.
