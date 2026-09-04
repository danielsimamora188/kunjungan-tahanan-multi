import React, { useEffect, useState } from 'react';
import { Printer, ArrowLeft, ShieldCheck, FileText, Download } from 'lucide-react';
import { PermohonanT10, SystemSettings, Tahanan } from '../types';
import { formatIndonesianDate } from '../utils/validation';

interface SuratT10ViewerProps {
  permohonan: PermohonanT10;
  settings: SystemSettings;
  onBack: () => void;
}

// Helper: calculate age from tanggalLahir
function hitungUmur(tanggalLahir: string): number {
  if (!tanggalLahir) return 0;
  const today = new Date();
  const birth = new Date(tanggalLahir);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatTanggalIndo(dateStr: string): string {
  return formatIndonesianDate(dateStr);
}

function getDayName(dateStr: string): string {
  if (!dateStr) return '-';
  const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  return days[new Date(dateStr).getDay()];
}

export const SuratT10Viewer: React.FC<SuratT10ViewerProps> = ({ permohonan, settings, onBack }) => {
  const [tahananDetail, setTahananDetail] = useState<Tahanan | null>(null);

  const isPenindakan = permohonan.direktorat === 'Penindakan' || String(permohonan.nomorSurat || "").includes("PMpd");
  const namaDirektorat = isPenindakan ? 'Direktorat Penindakan' : 'Direktorat Penuntutan';
  const sebutanPejabat = isPenindakan ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas';
  const anDirektur = isPenindakan ? 'An. Direktur Penindakan' : 'An. Direktur Penuntutan';

  useEffect(() => {
    // Fetch master data tahanan untuk melengkapi detail jika ada
    fetch(`/api/tahanan?direktorat=${permohonan.direktorat || 'Penuntutan'}`)
      .then(r => r.json())
      .then(json => {
        if (json.status === 'success') {
          const found = json.data.find((t: Tahanan) =>
            t.namaLengkap === permohonan.namaTahanan ||
            t.namaTahanan === permohonan.namaTahanan
          );
          if (found) setTahananDetail(found);
        }
      })
      .catch(() => {});
  }, [permohonan.namaTahanan, permohonan.direktorat]);

  const handlePrint = () => window.print();

  const handleExportWord = () => {
    const isApprovedDoc = permohonan.status === 'Disetujui' || permohonan.status === 'Selesai';
    const namaLengkapTah = tahananDetail?.namaLengkap || permohonan.namaTahanan;
    const tmpLahir = tahananDetail?.tempatLahir || 'Bogor';
    const tglLahir = tahananDetail?.tanggalLahir || '1968-06-13';
    const umr = tglLahir ? hitungUmur(tglLahir) : 56;
    const tglLahirFormat = tglLahir ? formatTanggalIndo(tglLahir) : '13 Juni 1968';
    const jnKelamin = tahananDetail?.jenisKelamin || 'Laki-Laki';
    const kbn = tahananDetail?.kebangsaan || 'Indonesia';
    const tmpTinggal = tahananDetail?.tempatTinggal || 'Lingkungan 02 Citata Dalam RT.004/RW.005 Kel.Ciriung, Kec.Cibinong, Kab.Bogor, Jawa Barat';
    const agm = tahananDetail?.agama || 'Islam';
    const pekerjTah = tahananDetail?.pekerjaan || (permohonan.pangkatNrpTahanan ? `Prajurit TNI (${permohonan.pangkatNrpTahanan})` : 'Prajurit TNI');
    const pend = tahananDetail?.pendidikan || 'SMA';
    const nikTah = tahananDetail?.nik || '3201011306680004';
    const tmpDitahan = tahananDetail?.tempatDitahan || permohonan.lokasiRutan || 'Rumah Tahanan Negara Salemba Cabang Kejaksaan Agung';

    const cleanV = (v: any) => (!v || v === '-' || v === 'undefined' || v === 'null') ? '' : String(v).trim();
    const nmPenandatangan = cleanV(permohonan.penandatanganNama) || cleanV(permohonan.namaPetugasPemeriksa) || cleanV(settings?.pejabatNama) || (isPenindakan ? 'Bambang Triyono, S.H., M.H.' : 'Agus Salim, S.H., M.H.');
    const pgkPenandatangan = cleanV(permohonan.penandatanganPangkat) || cleanV(settings?.pejabatPangkat) || (isPenindakan ? 'Jaksa Madya (IV/a)' : 'Jaksa Utama Muda (IV/c)');
    const nipPenandatangan = cleanV(permohonan.penandatanganNip) || cleanV(settings?.pejabatNip) || (isPenindakan ? '197905142003121003' : '197508122000031002');
    const tipeIdPenandatangan = cleanV(permohonan.penandatanganTipeIdentitas) || 'NIP';
    const jbtPenandatangan = cleanV(permohonan.penandatanganJabatan) || cleanV(settings?.pejabatJabatan) || (isPenindakan ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas');
    const ttdUrl = cleanV(permohonan.penandatanganTtdUrl);
    const hrKunjungan = getDayName(permohonan.tanggalKunjungan);
    const tglKunjunganFormat = permohonan.tanggalKunjungan ? formatTanggalIndo(permohonan.tanggalKunjungan) : '-';
    const tglSuratFormat = formatTanggalIndo(permohonan.createdAt || new Date().toISOString());

    const logoUrl = "https://upload.wikimedia.org/wikipedia/commons/b/b6/Kejaksaan_Agung_Republik_Indonesia_new_logo.png";

    const wordContent = `
    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Surat Izin Kunjungan T-10</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 215.9mm 330.2mm; /* Ukuran F4 / Folio MS Word */
          margin: 2.0cm 2.0cm 2.0cm 3.0cm; /* Margin Top: 2cm, Right: 2cm, Bottom: 2cm, Left: 3cm */
          mso-page-orientation: portrait;
        }
        @page Section1 {
          size: 215.9mm 330.2mm;
          margin: 2.0cm 2.0cm 2.0cm 3.0cm;
          mso-header-margin: 35.4pt;
          mso-footer-margin: 35.4pt;
          mso-paper-source: 0;
        }
        div.Section1 {
          page: Section1;
        }
        body {
          font-family: Arial, sans-serif !important;
          font-size: 12pt !important;
          line-height: 1.0 !important;
          color: #000000 !important;
        }
        p, div, span, td, th, li {
          font-family: Arial, sans-serif !important;
          font-size: 12pt !important;
          line-height: 1.0 !important;
          color: #000000 !important;
          margin: 0;
          padding: 0;
        }
        table {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        .kop-title {
          font-family: Arial, sans-serif !important;
          font-size: 14pt !important;
          font-weight: bold !important;
          text-transform: uppercase;
          line-height: 1.0 !important;
          text-align: center;
        }
        .kop-address {
          font-family: Arial, sans-serif !important;
          font-size: 10pt !important;
          line-height: 1.0 !important;
          text-align: center;
        }
        .surat-title {
          font-family: Arial, sans-serif !important;
          font-size: 12pt !important;
          font-weight: bold !important;
          text-decoration: underline;
          text-transform: uppercase;
          text-align: center;
        }
        .surat-nomor {
          font-family: Arial, sans-serif !important;
          font-size: 12pt !important;
          text-align: center;
        }
        .table-data {
          width: 100%;
          border-collapse: collapse;
          margin-left: 20px;
        }
        .table-data td {
          vertical-align: top;
          padding: 2px 0;
          font-size: 12pt !important;
        }
      </style>
    </head>
    <body>
      <div class="Section1">
        <!-- KOP SURAT KEJAKSAAN -->
        <table style="width:100%; border-bottom: 2px solid #000000; padding-bottom: 2px; margin-bottom: 6px;">
          <tr>
            <td style="width:75px; vertical-align:bottom; padding-bottom:0px;">
              <img src="${logoUrl}" width="70" height="85" style="width:70px; height:85px;" />
            </td>
            <td style="text-align:center; vertical-align:bottom; padding-bottom:0px;">
              <div class="kop-title">KEJAKSAAN REPUBLIK INDONESIA</div>
              <div class="kop-title" style="margin-top:2px;">KEJAKSAAN AGUNG</div>
              <div class="kop-address" style="margin-top:2px;">Jl. Sultan Hasanuddin Nomor 1, Kebayoran Baru, Jakarta Selatan</div>
              <div class="kop-address">Telp. (021) 7203061-63 (hunting) fax (021) 7251403 <u>www.kejaksaan.go.id</u></div>
            </td>
            <td style="width:75px; vertical-align:bottom;">&nbsp;</td>
          </tr>
        </table>

        <!-- KODE FORM T-10 M -->
        <div style="text-align:right; font-weight:bold; font-size:12pt; margin-top:6px; margin-bottom:12px;">
          T-10 M
        </div>

        <!-- JUDUL SURAT -->
        <div style="text-align:center; margin-bottom:16px;">
          <div class="surat-title">SURAT IZIN MENGUNJUNGI TAHANAN</div>
          <div class="surat-nomor" style="margin-top:2px;">Nomor: ${permohonan.nomorSurat}</div>
        </div>

        <!-- SECTION 1: PEMOHON -->
        <div style="margin-bottom:12px;">
          <div style="margin-bottom:4px;">Diberikan kepada :</div>
          <table class="table-data">
            <tr>
              <td style="width:180px;">Nama lengkap</td>
              <td style="width:15px;">:</td>
              <td style="font-weight:bold;">${permohonan.namaPemohon.toUpperCase()}</td>
            </tr>
            <tr>
              <td>Alamat</td>
              <td>:</td>
              <td>${permohonan.alamatPemohon || 'Grang Kahuripan Cluster Merapi RT 013 RW 011 Klapanunggal Bogor'}</td>
            </tr>
            <tr>
              <td>Pekerjaan</td>
              <td>:</td>
              <td>${permohonan.pekerjaanPemohon || 'Ibu Rumah Tangga'}</td>
            </tr>
            <tr>
              <td>Hubungan</td>
              <td>:</td>
              <td>${permohonan.hubungan}</td>
            </tr>
          </table>
        </div>

        <!-- SECTION 2: TAHANAN -->
        <div style="margin-bottom:16px;">
          <div style="margin-bottom:4px;">Untuk mengunjungi tahanan</div>
          <table class="table-data">
            <tr>
              <td style="width:180px;">Nama lengkap</td>
              <td style="width:15px;">:</td>
              <td style="font-weight:bold;">${namaLengkapTah.toUpperCase()}</td>
            </tr>
            <tr>
              <td>Tempat lahir</td>
              <td>:</td>
              <td>${tmpLahir}</td>
            </tr>
            <tr>
              <td>Umur / Tanggal lahir</td>
              <td>:</td>
              <td>${umr} Tahun / ${tglLahirFormat}</td>
            </tr>
            <tr>
              <td>Jenis kelamin</td>
              <td>:</td>
              <td>${jnKelamin}</td>
            </tr>
            <tr>
              <td>Kebangsaan /<br/>Kewarganegaraan</td>
              <td>:</td>
              <td>${kbn}.</td>
            </tr>
            <tr>
              <td>Tempat tinggal</td>
              <td>:</td>
              <td>${tmpTinggal}</td>
            </tr>
            <tr>
              <td>Agama</td>
              <td>:</td>
              <td>${agm}</td>
            </tr>
            <tr>
              <td>Pekerjaan</td>
              <td>:</td>
              <td>${pekerjTah}</td>
            </tr>
            <tr>
              <td>Pendidikan</td>
              <td>:</td>
              <td>${pend}</td>
            </tr>
            <tr>
              <td>NIK</td>
              <td>:</td>
              <td>${nikTah}</td>
            </tr>
            <tr>
              <td>Tempat Ditahan</td>
              <td>:</td>
              <td>${tmpDitahan}</td>
            </tr>
            <tr>
              <td>Keperluan</td>
              <td>:</td>
              <td>${permohonan.keperluanKunjungan || 'Bertemu/ berkunjung'}</td>
            </tr>
            <tr>
              <td>Ijin berlaku</td>
              <td>:</td>
              <td>
                <table style="width:100%;">
                  <tr>
                    <td style="width:65px;">Hari</td>
                    <td style="width:15px;">:</td>
                    <td>${hrKunjungan}</td>
                  </tr>
                  <tr>
                    <td>Tanggal</td>
                    <td>:</td>
                    <td>${tglKunjunganFormat}</td>
                  </tr>
                  <tr>
                    <td>Jam</td>
                    <td>:</td>
                    <td>Disesuaikan oleh petugas ${tmpDitahan}<br/>(waktu kunjungan 1 jam)</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <!-- SECTION 3: TANDA TANGAN -->
        <table style="width:100%; margin-top:20px;">
          <tr>
            <td style="width:50%;">&nbsp;</td>
            <td style="width:50%; text-align:center;">
              <div>Jakarta, ${tglSuratFormat}</div>
              <div style="margin-top:1px;">${anDirektur}</div>
              <div>${jbtPenandatangan}</div>
              <div style="margin-bottom:4px;">Selaku ${sebutanPejabat},</div>

              <div style="height:60px; margin:4px 0;">
                ${isApprovedDoc ? (
                  ttdUrl ? `<img src="${ttdUrl}" height="55" style="height:55px;" />` : `<div style="border:1px solid #16a34a; background:#f0fdf4; padding:4px 8px; display:inline-block; font-size:10pt; font-weight:bold; color:#14532d;">TERTANDA DIGITAL (BSrE - BSSN)</div>`
                ) : `<span style="font-style:italic; color:#dc2626;">[ Menunggu Pengesahan ]</span>`}
              </div>

              <div style="font-weight:bold; text-decoration:underline; margin-top:2px;">${nmPenandatangan}</div>
              <div style="margin-top:1px;">${pgkPenandatangan} ${tipeIdPenandatangan}. ${nipPenandatangan}</div>
            </td>
          </tr>
        </table>

        <!-- SECTION 4: TEMBUSAN -->
        <div style="margin-top:20px;">
          <div style="font-weight:normal; margin-bottom:4px;">Tembusan :</div>
          <ol style="margin:0; padding-left:22px; line-height:1.5;">
            <li style="padding-left:4px;">Yth. ${isPenindakan ? 'Direktur Penindakan' : 'Direktur Penuntutan'} (sebagai laporan);</li>
            <li style="padding-left:4px;">Yth. Kepala ${tmpDitahan};</li>
            <li style="padding-left:4px;">Tim Penyidik;</li>
            <li style="padding-left:4px;">Arsip.</li>
          </ol>
        </div>
      </div>
    </body>
    </html>
    `;

    const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Surat_T10_${permohonan.nomorSurat.replace(/[/\\?%*:|"<>]/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isApproved = permohonan.status === 'Disetujui' || permohonan.status === 'Selesai';

  // Data tahanan — gabungkan dari master data dan fallback ke permohonan
  const namaLengkapTahanan = tahananDetail?.namaLengkap || permohonan.namaTahanan;
  const tempatLahir = tahananDetail?.tempatLahir || 'Bogor';
  const tanggalLahir = tahananDetail?.tanggalLahir || '1968-06-13';
  const umur = tanggalLahir ? hitungUmur(tanggalLahir) : 56;
  const tglLahirFmt = tanggalLahir ? formatTanggalIndo(tanggalLahir) : '13 Juni 1968';
  const jenisKelamin = tahananDetail?.jenisKelamin || 'Laki-Laki';
  const kebangsaan = tahananDetail?.kebangsaan || 'Indonesia';
  const tempatTinggal = tahananDetail?.tempatTinggal || 'Lingkungan 02 Citata Dalam RT.004/RW.005 Kel.Ciriung, Kec.Cibinong, Kab.Bogor, Jawa Barat';
  const agama = tahananDetail?.agama || 'Islam';
  const pekerjaanTahanan = tahananDetail?.pekerjaan || (permohonan.pangkatNrpTahanan ? `Prajurit TNI (${permohonan.pangkatNrpTahanan})` : 'Prajurit TNI');
  const pendidikan = tahananDetail?.pendidikan || 'SMA';
  const nikTahanan = tahananDetail?.nik || '3201011306680004';
  const tempatDitahan = tahananDetail?.tempatDitahan || permohonan.lokasiRutan || 'Rumah Tahanan Negara Salemba Cabang Kejaksaan Agung';

  // Tanggal kunjungan
  const hariKunjungan = getDayName(permohonan.tanggalKunjungan);
  const tglKunjunganFmt = permohonan.tanggalKunjungan ? formatTanggalIndo(permohonan.tanggalKunjungan) : '-';

  // Tanggal surat terbit
  const tglSurat = formatTanggalIndo(permohonan.createdAt || new Date().toISOString());

  // Data Penandatangan (Penuntut Umum / Penyidik Koneksitas)
  const isPenindakanDoc = permohonan.direktorat === 'Penindakan' || String(permohonan.nomorSurat || "").includes("PMpd");
  const cleanVal = (v: any) => (!v || v === '-' || v === 'undefined' || v === 'null') ? '' : String(v).trim();

  const namaPenandatangan = cleanVal(permohonan.penandatanganNama) || cleanVal(permohonan.namaPetugasPemeriksa) || cleanVal(settings?.pejabatNama) || (isPenindakanDoc ? 'Bambang Triyono, S.H., M.H.' : 'Agus Salim, S.H., M.H.');
  const pangkatPenandatangan = cleanVal(permohonan.penandatanganPangkat) || cleanVal(settings?.pejabatPangkat) || (isPenindakanDoc ? 'Jaksa Madya (IV/a)' : 'Jaksa Utama Muda (IV/c)');
  const nipPenandatangan = cleanVal(permohonan.penandatanganNip) || cleanVal(settings?.pejabatNip) || (isPenindakanDoc ? '197905142003121003' : '197508122000031002');
  const tipeIdentitasPenandatangan = cleanVal(permohonan.penandatanganTipeIdentitas) || 'NIP';
  const jabatanPenandatangan = cleanVal(permohonan.penandatanganJabatan) || cleanVal(settings?.pejabatJabatan) || (isPenindakanDoc ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas');
  const ttdUrlPenandatangan = cleanVal(permohonan.penandatanganTtdUrl);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="print:hidden bg-slate-900 text-white p-4 rounded-2xl shadow-lg mb-6 flex flex-wrap justify-between items-center gap-3 border border-slate-800">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-500/40 font-bold">
            {namaDirektorat}
          </span>
          {!isApproved && (
            <span className="text-xs text-amber-300 bg-amber-950/80 px-3 py-1.5 rounded-lg border border-amber-500/40">
              ⚠️ Status: <strong>{permohonan.status.toUpperCase()}</strong> (Belum Disahkan)
            </span>
          )}
          <button
            onClick={handleExportWord}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-md"
          >
            <FileText className="w-4 h-4 text-blue-200" />
            Unduh Word (.doc)
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-md"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            Cetak / Simpan PDF (F4)
          </button>
        </div>
      </div>

      {/* ===== SURAT T-10 FORM DOKUMEN RESMI (F4) ===== */}
      <div
        id="surat-t10"
        className="bg-white text-slate-950 rounded-2xl shadow-2xl border border-slate-300 print:border-none print:shadow-none print:rounded-none relative"
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: '12pt',
          lineHeight: '1.0',
          color: '#000',
          padding: '2cm 2cm 2cm 3cm', // Margin: Top 2cm, Right 2cm, Bottom 2cm, Left 3cm
          boxSizing: 'border-box'
        }}
      >
        {/* CSS Khusus Cetak F4 (Folio) & Margins */}
        <style>{`
          @page {
            size: 215mm 330mm; /* Ukuran Kertas F4 / Folio */
            margin: 2cm 2cm 2cm 3cm; /* Top Right Bottom Left */
          }
          @media print {
            body {
              background: white !important;
            }
            #surat-t10 {
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              width: 100% !important;
            }
          }
        `}</style>

        {/* Watermark jika belum disetujui */}
        {!isApproved && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] rotate-[-30deg] z-10">
            <span className="text-8xl font-bold uppercase tracking-widest text-red-600 border-[10px] border-red-600 p-8 rounded-3xl">
              {permohonan.status}
            </span>
          </div>
        )}

        {/* ===== KOP SURAT KEJAKSAAN REPUBLIK INDONESIA ===== */}
        <div style={{ borderBottom: '2px solid black', paddingBottom: '4px', marginBottom: '4px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {/* Logo Kejaksaan RI Resmi dari Wikimedia */}
            <div style={{ width: '85px', flexShrink: 0, textAlign: 'left', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b6/Kejaksaan_Agung_Republik_Indonesia_new_logo.png"
                alt="Logo Kejaksaan Agung RI"
                style={{ width: '72px', height: '82px', objectFit: 'contain', display: 'block', position: 'relative', top: '3pt' }}
              />
            </div>

            {/* Teks Kop Center (Font 14pt untuk Judul Kop) */}
            <div style={{ flex: 1, textAlign: 'center', margin: '0 10px', paddingBottom: '0px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14pt', letterSpacing: '0.5px', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', lineHeight: '1.0' }}>
                KEJAKSAAN REPUBLIK INDONESIA
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '14pt', letterSpacing: '0.5px', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', lineHeight: '1.0', marginTop: '2px' }}>
                KEJAKSAAN AGUNG
              </div>
              <div style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif', marginTop: '1px', lineHeight: '1.0' }}>
                Jl. Sultan Hasanuddin Nomor 1, Kebayoran Baru, Jakarta Selatan
              </div>
              <div style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif', lineHeight: '1.0', marginBottom: '0px', paddingBottom: '0px' }}>
                Telp. (021) 7203061-63 (hunting) fax (021) 7251403 <span style={{ textDecoration: 'underline' }}>www.kejaksaan.go.id</span>
              </div>
            </div>

            <div style={{ width: '85px', flexShrink: 0 }}></div>
          </div>
        </div>

        {/* Kode Form Sebelah Kanan Atas */}
        <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12pt', fontFamily: 'Arial, sans-serif', marginTop: '6px', marginBottom: '14px' }}>
          T-10 M
        </div>

        {/* ===== JUDUL SURAT ===== */}
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12pt', textDecoration: 'underline', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', letterSpacing: '0.5px' }}>
            SURAT IZIN MENGUNJUNGI TAHANAN
          </div>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12pt', marginTop: '2px' }}>
            Nomor: {permohonan.nomorSurat}
          </div>
        </div>

        {/* ===== SECTION 1: PEMOHON ===== */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ marginBottom: '6px' }}>Diberikan kepada :</div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginLeft: '24px' }}>
            <tbody>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Nama lengkap</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ fontWeight: 'bold', verticalAlign: 'top', padding: '2px 0' }}>
                  {permohonan.namaPemohon.toUpperCase()}
                </td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Alamat</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                  {permohonan.alamatPemohon || 'Grang Kahuripan Cluster Merapi RT 013 RW 011 Klapanunggal Bogor'}
                </td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Pekerjaan</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                  {permohonan.pekerjaanPemohon || 'Ibu Rumah Tangga'}
                </td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Hubungan</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                  {permohonan.hubungan}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== SECTION 2: TAHANAN ===== */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '6px' }}>Untuk mengunjungi tahanan</div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginLeft: '24px' }}>
            <tbody>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Nama lengkap</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ fontWeight: 'bold', verticalAlign: 'top', padding: '2px 0' }}>
                  {namaLengkapTahanan.toUpperCase()}
                </td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Tempat lahir</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{tempatLahir}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Umur / Tanggal lahir</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                  {umur} Tahun / {tglLahirFmt}
                </td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Jenis kelamin</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{jenisKelamin}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Kebangsaan /<br />Kewarganegaraan</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{kebangsaan}.</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Tempat tinggal</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{tempatTinggal}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Agama</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{agama}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Pekerjaan</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{pekerjaanTahanan}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Pendidikan</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{pendidikan}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>NIK</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{nikTahanan}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Tempat Ditahan</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>{tempatDitahan}</td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Keperluan</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                  {permohonan.keperluanKunjungan || 'Bertemu/ berkunjung'}
                </td>
              </tr>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top', padding: '2px 0' }}>Ijin berlaku</td>
                <td style={{ width: '16px', verticalAlign: 'top', padding: '2px 0' }}>:</td>
                <td style={{ verticalAlign: 'top', padding: '2px 0' }}>
                  <table style={{ borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '65px', verticalAlign: 'top', padding: '1px 0' }}>Hari</td>
                        <td style={{ width: '14px', verticalAlign: 'top', padding: '1px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>{hariKunjungan}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>Tanggal</td>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>{tglKunjunganFmt}</td>
                      </tr>
                      <tr>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>Jam</td>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>:</td>
                        <td style={{ verticalAlign: 'top', padding: '1px 0' }}>
                          Disesuaikan oleh petugas {tempatDitahan}<br />(waktu kunjungan 1 jam)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== SECTION 3: TANDA TANGAN PEJABAT PENGESAH ===== */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ textAlign: 'center', minWidth: '380px', maxWidth: '460px' }}>
            <div style={{ fontSize: '12pt', fontFamily: 'Arial, sans-serif' }}>
              Jakarta, {tglSurat}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', marginTop: '1px' }}>
              {anDirektur}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', whiteSpace: 'nowrap' }}>
              {jabatanPenandatangan}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', marginBottom: '4px' }}>
              Selaku {sebutanPejabat},
            </div>

            {/* Gambar Tanda Tangan / E-Sign */}
            <div style={{ height: '65px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
              {isApproved ? (
                ttdUrlPenandatangan ? (
                  <img
                    src={ttdUrlPenandatangan}
                    alt={`Tanda Tangan ${sebutanPejabat}`}
                    style={{ maxHeight: '60px', maxWidth: '180px', objectFit: 'contain', margin: '0 auto' }}
                  />
                ) : (
                  <div style={{
                    border: '1px solid #16a34a', background: '#f0fdf4', padding: '4px 10px',
                    display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '4px', margin: '0 auto'
                  }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#15803d' }} />
                    <span style={{ fontSize: '10pt', fontFamily: 'Arial, sans-serif', fontWeight: 'bold', color: '#14532d' }}>
                      TERTANDA DIGITAL (BSrE - BSSN)
                    </span>
                  </div>
                )
              ) : (
                <span style={{ fontSize: '11pt', color: '#dc2626', fontStyle: 'italic' }}>
                  [ Menunggu Pengesahan ]
                </span>
              )}
            </div>

            {/* Nama & NIP/NRP Pejabat yang Menyetujui */}
            <div style={{ fontWeight: 'bold', fontFamily: 'Arial, sans-serif', fontSize: '12pt', marginTop: '2px', textDecoration: 'underline' }}>
              {namaPenandatangan}
            </div>
            <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', marginTop: '1px' }}>
              {pangkatPenandatangan} {tipeIdentitasPenandatangan}. {nipPenandatangan}
            </div>
          </div>
        </div>

        {/* ===== SECTION 4: TEMBUSAN ===== */}
        <div style={{ marginTop: '20px', fontFamily: 'Arial, sans-serif', fontSize: '12pt', color: '#000' }}>
          <div style={{ fontWeight: 'normal', marginBottom: '4px' }}>Tembusan :</div>
          <ol style={{ margin: 0, paddingLeft: '22px', lineHeight: '1.5', listStyleType: 'decimal' }}>
            <li style={{ paddingLeft: '4px' }}>Yth. {isPenindakan ? 'Direktur Penindakan' : 'Direktur Penuntutan'} (sebagai laporan);</li>
            <li style={{ paddingLeft: '4px' }}>Yth. Kepala {tempatDitahan};</li>
            <li style={{ paddingLeft: '4px' }}>Tim Penyidik;</li>
            <li style={{ paddingLeft: '4px' }}>Arsip.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
