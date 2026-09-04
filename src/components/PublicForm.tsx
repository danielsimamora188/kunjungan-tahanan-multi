import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  User,
  Users,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  Lock,
  QrCode as QrCodeIcon,
  ChevronDown,
  Upload,
  X as XIcon,
  Camera,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Shield,
  MessageSquare
} from 'lucide-react';
import { formatIndonesianDate, compressBase64Image } from '../utils/validation';
import { HubunganTahanan, PermohonanT10, Tahanan, Direktorat } from '../types';
import { LoadingScreen } from './LoadingScreen';
import QRCode from 'qrcode';

interface PublicFormProps {
  direktorat?: Direktorat;
  onSuccess: (newPermohonan: PermohonanT10) => void;
  onViewDoc: (permohonan: PermohonanT10) => void;
  onTrack: (identifier: string) => void;
}

export const PublicForm: React.FC<PublicFormProps> = ({
  direktorat = 'Penuntutan',
  onSuccess,
  onViewDoc,
  onTrack
}) => {
  // Master data tahanan
  const [tahananList, setTahananList] = useState<Tahanan[]>([]);
  const [selectedTahananId, setSelectedTahananId] = useState('');
  const selectedTahanan = tahananList.find(t => t.id === selectedTahananId) || null;

  // Form State
  const [nikPemohon, setNikPemohon] = useState('');
  const [namaPemohon, setNamaPemohon] = useState('');
  const [noWhatsApp, setNoWhatsApp] = useState('');
  const [alamatPemohon, setAlamatPemohon] = useState('');
  const [pekerjaanPemohon, setPekerjaanPemohon] = useState('');
  const [tanggalKunjungan, setTanggalKunjungan] = useState('');
  const [sesiKunjungan, setSesiKunjungan] = useState<'Sesi Pagi (09.00 - 11.30 WIB)' | 'Sesi Siang (13.30 - 15.30 WIB)'>('Sesi Pagi (09.00 - 11.30 WIB)');
  const [hubungan, setHubungan] = useState<string>('');
  const [keperluanKunjungan, setKeperluanKunjungan] = useState('');
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);

  // KTP photo
  const [fotoKTP, setFotoKTP] = useState<string>('');
  const ktpInputRef = useRef<HTMLInputElement>(null);

  // Status State
  const [isLoadingTahanan, setIsLoadingTahanan] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<PermohonanT10 | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Fetch list tahanan from admin master data filtered by this direktorat
  useEffect(() => {
    setIsLoadingTahanan(true);
    setSelectedTahananId('');
    fetch(`/api/tahanan?direktorat=${direktorat}`)
      .then(r => r.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          const filtered = json.data.filter((t: Tahanan) => (t.direktorat || 'Penuntutan') === direktorat);
          setTahananList(filtered);
        } else {
          setTahananList([]);
        }
      })
      .catch(err => {
        console.error('Gagal memuat daftar tahanan:', err);
        setTahananList([]);
      })
      .finally(() => setIsLoadingTahanan(false));
  }, [direktorat]);

  const isFormValid = useMemo(() => {
    return (
      nikPemohon.length === 16 &&
      namaPemohon.trim().length >= 3 &&
      noWhatsApp.trim().length >= 10 &&
      selectedTahananId !== '' &&
      tanggalKunjungan !== '' &&
      hubungan.trim().length >= 2 &&
      keperluanKunjungan.trim().length >= 5 &&
      setujuTataTertib
    );
  }, [nikPemohon, namaPemohon, noWhatsApp, selectedTahananId, tanggalKunjungan, hubungan, keperluanKunjungan, setujuTataTertib]);

  const handleKTPUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const compressed = await compressBase64Image(raw, 600, 600, 0.6);
      setFotoKTP(compressed);
    };
    reader.readAsDataURL(file);
  };

  // Tomorrow as min date
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!setujuTataTertib) {
      setErrorMessage('Anda wajib menyetujui pernyataan tata tertib.');
      return;
    }

    setIsSubmitting(true);

    if (!selectedTahanan) {
      setErrorMessage('Harap pilih nama tahanan dari daftar yang tersedia.');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        direktorat,
        nikPemohon: nikPemohon.trim(),
        namaPemohon: namaPemohon.trim(),
        noWhatsApp: noWhatsApp.trim(),
        alamatPemohon: alamatPemohon.trim() || '-',
        pekerjaanPemohon: pekerjaanPemohon.trim() || 'Masyarakat Umum',
        fotoKTP: fotoKTP || '',
        namaTahanan: selectedTahanan.namaTahanan || selectedTahanan.namaLengkap,
        pangkatNrpTahanan: selectedTahanan.pangkatNrpTahanan,
        satuanTahanan: selectedTahanan.satuanTahanan,
        lokasiRutan: selectedTahanan.lokasiRutan || selectedTahanan.tempatDitahan,
        tanggalKunjungan,
        sesiKunjungan,
        hubungan,
        keperluanKunjungan: keperluanKunjungan.trim(),
        jumlahPengunjung: 1,
        namaPengikut: '-',
      };

      const response = await fetch('/api/permohonan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await response.json();

      if (!response.ok || resJson.status !== 'success') {
        throw new Error(resJson.message || 'Gagal mengirim formulir permohonan.');
      }

      const created: PermohonanT10 = resJson.data;
      setSubmittedData(created);
      onSuccess(created);

      // Generate QR Code
      const qrData = `JAMPIDMIL-T10|${created.nomorSurat}|DIR:${direktorat}|TAHANAN:${created.namaTahanan}|TGL:${created.tanggalKunjungan}`;
      try {
        const qr = await QRCode.toDataURL(qrData, { width: 220, margin: 1 });
        setQrCodeUrl(qr);
      } catch (qrErr) {
        console.error('QR code generation error:', qrErr);
      }

    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan jaringan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setNikPemohon('');
    setNamaPemohon('');
    setNoWhatsApp('');
    setAlamatPemohon('');
    setPekerjaanPemohon('');
    setSelectedTahananId('');
    setFotoKTP('');
    setTanggalKunjungan('');
    setSesiKunjungan('Sesi Pagi (09.00 - 11.30 WIB)');
    setHubungan('');
    setKeperluanKunjungan('');
    setSetujuTataTertib(false);
    setSubmittedData(null);
    setQrCodeUrl('');
    setErrorMessage(null);
  };

  const handleConfirmViaWa = async () => {
    if (!submittedData) return;
    const currentDir = submittedData.direktorat || direktorat;
    try {
      const resp = await fetch(`/api/admin-wa?direktorat=${currentDir}`);
      const json = await resp.json();
      let rawPhone = json.waNumber || (currentDir === 'Penindakan' ? '081299887766' : '081398765432');
      let waPhone = rawPhone.replace(/\D/g, '');
      if (waPhone.startsWith('0')) {
        waPhone = '62' + waPhone.substring(1);
      }
      const message = `Yth. Admin Direktorat ${currentDir} JAMPIDMIL,\n\nSaya telah mengajukan Permohonan Kunjungan Tahanan (T-10):\n• No. Registrasi: ${submittedData.nomorSurat}\n• Nama Pemohon: ${submittedData.namaPemohon} (NIK: ${submittedData.nikPemohon})\n• Nama Tahanan: ${submittedData.namaTahanan}\n• Tgl Kunjungan: ${formatIndonesianDate(submittedData.tanggalKunjungan)} (${submittedData.sesiKunjungan})\n• Keperluan: ${submittedData.keperluanKunjungan}\n\nMohon diproses. Terima kasih.`;

      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    } catch {
      const waPhone = currentDir === 'Penindakan' ? '6281299887766' : '6281398765432';
      const message = `Yth. Admin Direktorat ${currentDir} JAMPIDMIL,\n\nSaya telah mengajukan Permohonan Kunjungan Tahanan (T-10):\n• No. Registrasi: ${submittedData.nomorSurat}\n• Nama Pemohon: ${submittedData.namaPemohon}\n• Nama Tahanan: ${submittedData.namaTahanan}\n\nMohon diproses. Terima kasih.`;
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  if (isLoadingTahanan) {
    return <LoadingScreen message={`Memuat Data Tahanan (Direktorat ${direktorat})...`} />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-[#0a2e1e] text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-400 border border-amber-500/30 rounded-lg bg-amber-500/10">
              Formulir Resmi T-10
            </span>
            <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-400/30 rounded-lg bg-emerald-500/20">
              Direktorat {direktorat}
            </span>
          </div>
          <p className="text-slate-300 text-sm max-w-xl">
            Layanan pengajuan izin kunjungan tahanan koneksitas di bawah kewenangan <strong>Direktorat {direktorat} JAMPIDMIL</strong>.
          </p>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {submittedData ? (
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center border-b border-slate-100 pb-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-300">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Permohonan Kunjungan Berhasil Terkirim!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Surat permohonan kunjungan tahanan (T-10) Anda sedang diproses oleh petugas Direktorat {submittedData.direktorat || direktorat}.
            </p>
            <div className="mt-3 inline-block bg-slate-900 text-amber-300 px-4 py-1.5 rounded-xl font-mono text-xs font-bold border border-slate-800">
              No. Registrasi: {submittedData.nomorSurat}
            </div>
          </div>

          <div className="py-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* QR Code Container */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 rounded-lg shadow-sm" />
              ) : (
                <div className="w-40 h-40 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                  <QrCodeIcon className="w-12 h-12" />
                </div>
              )}
              <span className="text-[11px] font-semibold text-slate-600 mt-2">
                QR Validasi Petugas
              </span>
            </div>

            {/* Rincian Permohonan */}
            <div className="md:col-span-2 space-y-2.5 text-sm text-slate-700">
              <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Direktorat</span>
                <span className="col-span-2 font-bold text-emerald-800">{submittedData.direktorat || direktorat}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Pengunjung</span>
                <span className="col-span-2 font-semibold text-slate-900">{submittedData.namaPemohon}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Tahanan</span>
                <span className="col-span-2 font-semibold text-slate-900">{submittedData.namaTahanan}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Hubungan</span>
                <span className="col-span-2 font-medium text-slate-900">{submittedData.hubungan}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Jadwal</span>
                <span className="col-span-2 font-medium text-slate-900">
                  {formatIndonesianDate(submittedData.tanggalKunjungan)} ({submittedData.sesiKunjungan})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 py-1">
                <span className="text-slate-500 font-medium">Status Awal</span>
                <span className="col-span-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    🟡 {submittedData.status}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-xs text-amber-900 mb-6 leading-relaxed">
            <strong>Catatan:</strong> Simpan Nomor Registrasi atau Screenshot QR Code di atas. Tekan tombol hijau di bawah untuk mengonfirmasi permohonan secara langsung ke WhatsApp Admin Direktorat {submittedData.direktorat || direktorat}.
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Buat Permohonan Baru
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleConfirmViaWa}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Konfirmasi via WhatsApp
              </button>
              <button
                type="button"
                onClick={() => onTrack(submittedData.nomorSurat)}
                className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-[#0a2e1e] hover:bg-[#0d3d28] rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                Lacak Status
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Form Registration */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-8">
          {errorMessage && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: PILIH TAHANAN */}
          <div>
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                Pilih Tahanan yang Akan Dikunjungi (Direktorat {direktorat})
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Tahanan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedTahananId}
                    onChange={(e) => setSelectedTahananId(e.target.value)}
                    required
                    className="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] focus:border-transparent transition"
                  >
                    <option value="">
                      {tahananList.length > 0
                        ? `-- Pilih Tahanan Direktorat ${direktorat} (${tahananList.length} Tahanan Tersedia) --`
                        : `-- Belum ada data tahanan terdaftar untuk Direktorat ${direktorat} --`}
                    </option>
                    {tahananList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.namaLengkap || t.namaTahanan} — {t.pangkatNrpTahanan} ({t.satuanTahanan})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-4 pointer-events-none" />
                </div>
              </div>

              {selectedTahanan && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 space-y-1.5 animate-in fade-in duration-200">
                  <p className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Data Tahanan Terverifikasi:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
                    <div>
                      <span className="text-slate-500">Nama: </span>
                      <strong>{selectedTahanan.namaLengkap || selectedTahanan.namaTahanan}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Pangkat / NRP: </span>
                      <strong>{selectedTahanan.pangkatNrpTahanan || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Satuan: </span>
                      <strong>{selectedTahanan.satuanTahanan || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Tempat Ditahan: </span>
                      <strong>{selectedTahanan.lokasiRutan || selectedTahanan.tempatDitahan || 'RTM Guntur'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: IDENTITAS PEMOHON */}
          <div>
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                Identitas Pemohon / Pengunjung
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  NIK (KTP) Pemohon <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={16}
                    value={nikPemohon}
                    onChange={(e) => setNikPemohon(e.target.value.replace(/\D/g, ''))}
                    placeholder="16 Digit Nomor Induk Kependudukan"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Harus tepat 16 digit numerik.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap Pemohon <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaPemohon}
                  onChange={(e) => setNamaPemohon(e.target.value)}
                  placeholder="Sesuai KTP asli..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={noWhatsApp}
                    onChange={(e) => setNoWhatsApp(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Notifikasi persetujuan surat dikirim ke nomor ini.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hubungan dengan Tahanan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={hubungan}
                  onChange={(e) => setHubungan(e.target.value)}
                  placeholder="Contoh: Istri, Anak, Penasihat Hukum, Atasan Satuan..."
                  maxLength={80}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">Isi sesuai hubungan Anda dengan tahanan (misal: Istri, Ayah, Kuasa Hukum).</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pekerjaan Pemohon
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={pekerjaanPemohon}
                    onChange={(e) => setPekerjaanPemohon(e.target.value)}
                    placeholder="Contoh: Karyawan Swasta, Advokat, PNS"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Unggah Foto KTP Asli (Opsional)
                </label>
                <input
                  type="file"
                  ref={ktpInputRef}
                  accept="image/*"
                  onChange={handleKTPUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ktpInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-semibold text-slate-600 flex items-center justify-center gap-2 transition"
                >
                  <Camera className="w-4 h-4 text-amber-600" />
                  {fotoKTP ? 'Foto KTP Terlampir (Klik untuk Ganti)' : 'Pilih Foto KTP'}
                </button>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Lengkap Pemohon
                </label>
                <input
                  type="text"
                  value={alamatPemohon}
                  onChange={(e) => setAlamatPemohon(e.target.value)}
                  placeholder="Nama jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: JADWAL & MAKSUD KUNJUNGAN */}
          <div>
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                Jadwal & Keperluan Kunjungan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tanggal Rencana Kunjungan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  min={minDate}
                  value={tanggalKunjungan}
                  onChange={(e) => setTanggalKunjungan(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sesi Jam Kunjungan <span className="text-red-500">*</span>
                </label>
                <select
                  value={sesiKunjungan}
                  onChange={(e) => setSesiKunjungan(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition"
                >
                  <option value="Sesi Pagi (09.00 - 11.30 WIB)">Sesi Pagi (09.00 - 11.30 WIB)</option>
                  <option value="Sesi Siang (13.30 - 15.30 WIB)">Sesi Siang (13.30 - 15.30 WIB)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Keperluan / Maksud Kunjungan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={keperluanKunjungan}
                  onChange={(e) => setKeperluanKunjungan(e.target.value)}
                  placeholder="Jelaskan maksud dan tujuan kunjungan secara ringkas..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* PERNYATAAN & TATA TERTIB */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs text-slate-600">
            <p className="font-bold text-slate-800 uppercase tracking-wider">
              Pernyataan & Tata Tertib Kunjungan:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
              <li>Membawa KTP asli dan Surat Izin T-10 resmi yang telah disetujui saat datang ke Rutan.</li>
              <li>Dilarang membawa alat komunikasi, kamera, senjata tajam/api, obat terlarang, atau barang terlarang lainnya.</li>
              <li>Berpakaian sopan dan rapi serta mematuhi protokol keamanan Rutan militer.</li>
            </ul>
            <label className="flex items-start gap-2.5 pt-2 border-t border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={setujuTataTertib}
                onChange={(e) => setSetujuTataTertib(e.target.checked)}
                className="mt-0.5 rounded text-[#0a2e1e] focus:ring-[#0a2e1e]"
              />
              <span className="font-semibold text-slate-800">
                Saya menyatakan bahwa seluruh data yang saya isikan adalah benar dan bersedia mematuhi tata tertib kunjungan yang berlaku.
              </span>
            </label>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full py-3.5 px-6 bg-[#0a2e1e] hover:bg-[#0d3d28] text-white rounded-xl font-bold text-sm sm:text-base shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Memproses Pendaftaran...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-400" />
                Kirim Permohonan Izin Kunjungan (Direktorat {direktorat})
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
