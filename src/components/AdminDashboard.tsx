import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  FileText, 
  Phone, 
  Settings, 
  Download, 
  RefreshCw, 
  ChevronRight, 
  AlertCircle, 
  Send, 
  Eye, 
  CheckSquare, 
  UserCheck,
  Building,
  Calendar,
  ExternalLink,
  ClipboardList,
  Users,
  Copy,
  FileSpreadsheet,
  Trash2,
  X,
  Building2
} from 'lucide-react';
import { PermohonanT10, StatusPermohonan, SystemSettings, Direktorat } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/blueprintData';
import { formatIndonesianDate } from '../utils/validation';

interface AdminDashboardProps {
  permohonanList: PermohonanT10[];
  systemSettings: SystemSettings;
  onRefresh: () => void;
  onUpdateStatus: (
    id: string,
    newStatus: StatusPermohonan,
    catatan?: string,
    namaPetugas?: string,
    penandatanganData?: {
      nama?: string;
      pangkat?: string;
      nip?: string;
      tipeIdentitas?: 'NIP' | 'NRP';
      jabatan?: string;
      ttdUrl?: string;
    }
  ) => Promise<void>;
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
  onViewDoc: (permohonan: PermohonanT10) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  permohonanList,
  systemSettings,
  onRefresh,
  onUpdateStatus,
  onSaveSettings,
  onViewDoc,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [activeTabDir, setActiveTabDir] = useState<Direktorat | 'Semua'>('Semua');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal Edit Status State
  const [selectedItem, setSelectedItem] = useState<PermohonanT10 | null>(null);
  const [editStatus, setEditStatus] = useState<StatusPermohonan>('Diproses');
  const [editCatatan, setEditCatatan] = useState('');
  const [editPetugas, setEditPetugas] = useState('');
  const [selectedAkunId, setSelectedAkunId] = useState<string>('');
  const [akunList, setAkunList] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewKtpItem, setViewKtpItem] = useState<PermohonanT10 | null>(null);

  const loggedInUserRaw = localStorage.getItem('userAccount');
  const currentUser = loggedInUserRaw ? JSON.parse(loggedInUserRaw) : null;
  const isStaff = currentUser?.role === 'Staff';
  const isPUK = currentUser?.role === 'Penuntut Umum Koneksitas';
  const isPenyidik = currentUser?.role === 'Penyidik Koneksitas';
  const isSigner = isPUK || isPenyidik;
  const isAdmin = currentUser?.role === 'Admin';

  React.useEffect(() => {
    if (currentUser?.direktorat) {
      setActiveTabDir(currentUser.direktorat);
    }

    fetch('/api/akun')
      .then(r => r.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          setAkunList(json.data);
          if (isSigner) {
            const myAkun = json.data.find((a: any) => a.nip === currentUser.nip || a.nama === currentUser.nama);
            if (myAkun) setSelectedAkunId(myAkun.id);
          } else {
            const defaultSigner = json.data.find((a: any) => a.role === 'Penuntut Umum Koneksitas' || a.role === 'Penyidik Koneksitas');
            if (defaultSigner) setSelectedAkunId(defaultSigner.id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<SystemSettings>({ ...systemSettings });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [testGasStatus, setTestGasStatus] = useState<{ loading: boolean; result?: any; error?: string }>({ loading: false });
  const [testGasPenindakanStatus, setTestGasPenindakanStatus] = useState<{ loading: boolean; result?: any; error?: string }>({ loading: false });
  const [testWaStatus, setTestWaStatus] = useState<{ loading: boolean; result?: any; error?: string }>({ loading: false });

  // Filtered List
  const filteredList = useMemo(() => {
    return permohonanList.filter((item) => {
      const matchDir = activeTabDir === 'Semua' || (item.direktorat || 'Penuntutan') === activeTabDir;
      const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.nomorSurat.toLowerCase().includes(q) ||
        item.nikPemohon.includes(q) ||
        item.namaPemohon.toLowerCase().includes(q) ||
        item.namaTahanan.toLowerCase().includes(q) ||
        item.satuanTahanan.toLowerCase().includes(q) ||
        item.noWhatsApp.includes(q);

      return matchDir && matchStatus && matchQuery;
    });
  }, [permohonanList, activeTabDir, filterStatus, searchQuery]);

  // Metric Counters
  const counts = useMemo(() => {
    const list = activeTabDir === 'Semua' 
      ? permohonanList 
      : permohonanList.filter(p => (p.direktorat || 'Penuntutan') === activeTabDir);
    return {
      total: list.length,
      diproses: list.filter((p) => p.status === 'Diproses').length,
      disetujui: list.filter((p) => p.status === 'Disetujui').length,
      ditolak: list.filter((p) => p.status === 'Ditolak').length,
      selesai: list.filter((p) => p.status === 'Selesai').length,
    };
  }, [permohonanList, activeTabDir]);

  const handleOpenEditModal = (item: PermohonanT10) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    setEditCatatan(item.catatanPetugas || '');
    setEditPetugas(item.namaPetugasPemeriksa || currentUser?.nama || 'Petugas JAMPIDMIL');
    
    // Find matching akun in the same direktorat
    const itemDir = item.direktorat || 'Penuntutan';
    const matched = akunList.find(a => a.nama === item.penandatanganNama);
    if (matched) {
      setSelectedAkunId(matched.id);
    } else {
      const expectedRole = itemDir === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas';
      const signer = akunList.find(a => a.role === expectedRole && (a.direktorat || 'Penuntutan') === itemDir) 
        || akunList.find(a => a.role === expectedRole)
        || akunList[0];
      setSelectedAkunId(signer?.id || '');
    }
  };

  const handleSaveStatus = async () => {
    if (!selectedItem) return;

    setIsUpdating(true);
    try {
      let penandatanganData;
      const itemDir = selectedItem.direktorat || 'Penuntutan';

      if (isSigner) {
        const myAkun = akunList.find(a => a.nip === currentUser?.nip || a.nama === currentUser?.nama) || currentUser;
        penandatanganData = {
          nama: myAkun?.nama || currentUser?.nama,
          pangkat: myAkun?.pangkat || currentUser?.pangkat || "Jaksa Madya",
          nip: myAkun?.nip || currentUser?.nip || "",
          tipeIdentitas: (myAkun as any)?.tipeIdentitas || (currentUser as any)?.tipeIdentitas || "NIP",
          jabatan: myAkun?.jabatan || currentUser?.jabatan || (itemDir === 'Penindakan' ? "Penyidik Koneksitas" : "Penuntut Umum Koneksitas"),
          ttdUrl: myAkun?.fotoTandaTangan || currentUser?.fotoTandaTangan || "",
        };
      } else {
        const selectedAkun = akunList.find(a => a.id === selectedAkunId);
        penandatanganData = selectedAkun ? {
          nama: selectedAkun.nama,
          pangkat: selectedAkun.pangkat,
          nip: selectedAkun.nip,
          tipeIdentitas: (selectedAkun as any).tipeIdentitas || "NIP",
          jabatan: selectedAkun.jabatan,
          ttdUrl: selectedAkun.fotoTandaTangan,
        } : undefined;
      }

      await onUpdateStatus(
        selectedItem.id,
        editStatus,
        editCatatan,
        penandatanganData?.nama || editPetugas,
        penandatanganData
      );
      setSelectedItem(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nomorSurat: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const handleDeletePermohonan = (id: string, nomorSurat: string) => {
    setDeleteTarget({ id, nomorSurat });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/permohonan/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await resp.json();
      if (json.status === 'success') {
        setDeleteSuccess(`Data permohonan ${deleteTarget.nomorSurat} berhasil dihapus.`);
        onRefresh();
        setTimeout(() => setDeleteSuccess(null), 3000);
      } else {
        alert(json.message || 'Gagal menghapus data.');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const cancelDelete = () => setDeleteTarget(null);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleTestGasWebhook = async (url: string, isPenindakan = false) => {
    if (!url) {
      if (isPenindakan) setTestGasPenindakanStatus({ loading: false, error: 'URL Google Apps Script Penindakan belum diisi.' });
      else setTestGasStatus({ loading: false, error: 'URL Google Apps Script Penuntutan belum diisi.' });
      return;
    }
    if (isPenindakan) setTestGasPenindakanStatus({ loading: true });
    else setTestGasStatus({ loading: true });

    try {
      const resp = await fetch('/api/test-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await resp.json();
      if (isPenindakan) setTestGasPenindakanStatus({ loading: false, result: data });
      else setTestGasStatus({ loading: false, result: data });
    } catch (err: any) {
      if (isPenindakan) setTestGasPenindakanStatus({ loading: false, error: err.message });
      else setTestGasStatus({ loading: false, error: err.message });
    }
  };

  const handleTestWhatsApp = async () => {
    setTestWaStatus({ loading: true });
    try {
      const resp = await fetch('/api/test-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: tempSettings.waGatewayProvider,
          apiKey: tempSettings.waApiKey,
          targetPhone: tempSettings.waAdminPhone,
        }),
      });
      const data = await resp.json();
      setTestWaStatus({ loading: false, result: data });
    } catch (err: any) {
      setTestWaStatus({ loading: false, error: err.message });
    }
  };

  const handleSaveAllSettings = async () => {
    setIsSavingSettings(true);
    try {
      await onSaveSettings(tempSettings);
      setShowSettingsModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'No. Surat T-10',
      'Direktorat',
      'Waktu Daftar',
      'Nama Pemohon',
      'NIK Pemohon',
      'No WhatsApp',
      'Hubungan',
      'Nama Tahanan',
      'Satuan Tahanan',
      'Lokasi RTM',
      'Tanggal Kunjungan',
      'Sesi',
      'Status',
      'Catatan Petugas',
    ];

    const listToExport = filteredList;
    const rows = listToExport.map((p) => [
      `"${p.nomorSurat}"`,
      `"${p.direktorat || 'Penuntutan'}"`,
      `"${p.createdAt}"`,
      `"${p.namaPemohon}"`,
      `"'${p.nikPemohon}"`,
      `"${p.noWhatsApp}"`,
      `"${p.hubungan}"`,
      `"${p.namaTahanan}"`,
      `"${p.satuanTahanan}"`,
      `"${p.lokasiRutan}"`,
      `"${p.tanggalKunjungan}"`,
      `"${p.sesiKunjungan}"`,
      `"${p.status}"`,
      `"${p.catatanPetugas || '-'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_t10_jampidmil_${activeTabDir.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-200 animate-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Konfirmasi Hapus</h3>
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Apakah Anda yakin ingin menghapus data permohonan kunjungan:
            </p>
            <p className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-2 rounded-lg mb-4 font-mono">
              {deleteTarget.nomorSurat}
            </p>
            <p className="text-xs text-red-600 mb-5">
              ⚠️ Data yang dihapus tidak dapat dipulihkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Hapus Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Toast */}
      {deleteSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-800 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in text-sm font-semibold border border-emerald-600">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          {deleteSuccess}
          <button onClick={() => setDeleteSuccess(null)} className="ml-2 text-emerald-300 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JAMPIDMIL · Kejaksaan RI</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
            Dashboard Surat Izin T-10
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => {
                setTempSettings({ ...systemSettings });
                setShowSettingsModal(true);
              }}
              className="p-2.5 bg-emerald-950 hover:bg-emerald-900 text-amber-400 rounded-xl transition text-xs font-bold flex items-center gap-1.5 shadow-sm border border-amber-500/40"
            >
              <Settings className="w-4 h-4" />
              <span>Integrasi Spreadsheet & WA</span>
            </button>
          )}

          <button
            id="btn-refresh-data"
            onClick={handleManualRefresh}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-800 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan Data</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-800" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs Filter Direktorat */}
      <div className="flex border-b border-slate-200 gap-2">
        {(['Semua', 'Penuntutan', 'Penindakan'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTabDir(tab)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
              activeTabDir === tab
                ? 'border-[#0a2e1e] text-[#0a2e1e]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'Semua' ? 'Semua Direktorat' : `Direktorat ${tab}`}
            <span className="ml-2 text-xs py-0.5 px-2 rounded-full bg-slate-100 text-slate-600">
              {tab === 'Semua' ? permohonanList.length : permohonanList.filter(p => (p.direktorat || 'Penuntutan') === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500">Total Permohonan</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{counts.total}</span>
            <span className="text-[10px] text-slate-400">T-10 2026</span>
          </div>
        </div>

        <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/90 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Menunggu (Diproses)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-950">{counts.diproses}</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-200/70 px-1.5 py-0.5 rounded">Piket</span>
          </div>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200/90 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Disetujui (Terbit)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-950">{counts.disetujui}</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-200/70 px-1.5 py-0.5 rounded">Sah</span>
          </div>
        </div>

        <div className="bg-red-50/80 p-4 rounded-xl border border-red-200/90 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-red-900 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> Ditolak
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-950">{counts.ditolak}</span>
            <span className="text-[10px] font-semibold text-red-700 bg-red-200/70 px-1.5 py-0.5 rounded">Gagal</span>
          </div>
        </div>

        <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200/90 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Kunjungan Selesai
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-950">{counts.selesai}</span>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-200/70 px-1.5 py-0.5 rounded">RTM</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {['Semua', 'Diproses', 'Disetujui', 'Ditolak', 'Selesai'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-[#0a2e1e] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {st} {st !== 'Semua' && `(${permohonanList.filter((p) => {
                const matchDir = activeTabDir === 'Semua' || (p.direktorat || 'Penuntutan') === activeTabDir;
                return matchDir && p.status === st;
              }).length})`}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. Surat, NIK, Pemohon..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#0a2e1e] text-slate-300 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">No. Surat T-10</th>
                <th className="px-4 py-3.5">Direktorat</th>
                <th className="px-4 py-3.5">Pemohon & NIK</th>
                <th className="px-4 py-3.5">Tahanan Militer</th>
                <th className="px-4 py-3.5">Jadwal & Lokasi</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-600">Tidak ada permohonan yang sesuai filter.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    {/* No Surat T-10 */}
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-950 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>{item.nomorSurat}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                        {formatIndonesianDate(item.createdAt)}
                      </span>
                    </td>

                    {/* Direktorat */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {item.direktorat || 'Penuntutan'}
                      </span>
                    </td>

                    {/* Data Pemohon */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{item.namaPemohon}</p>
                      <p className="font-mono text-[11px] text-slate-500">NIK: {item.nikPemohon}</p>
                      <span className="inline-block text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium mt-0.5">
                        {item.hubungan}
                      </span>
                    </td>

                    {/* Tahanan Militer */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{item.namaTahanan}</p>
                      <p className="text-[11px] text-slate-600">{item.pangkatNrpTahanan}</p>
                      <p className="text-[10px] text-emerald-800 font-semibold">{item.satuanTahanan}</p>
                    </td>

                    {/* Jadwal & Lokasi */}
                    <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                      <p className="font-semibold text-slate-900">{formatIndonesianDate(item.tanggalKunjungan)}</p>
                      <p className="text-[11px] text-slate-500">{item.sesiKunjungan}</p>
                      <p className="text-[10px] text-slate-600 truncate max-w-[140px]" title={item.lokasiRutan}>
                        {item.lokasiRutan}
                      </p>
                    </td>

                    {/* Status Permohonan */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {item.status === 'Disetujui' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Disetujui
                        </span>
                      )}
                      {item.status === 'Diproses' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" /> Diproses
                        </span>
                      )}
                      {item.status === 'Ditolak' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                          <XCircle className="w-3 h-3 text-red-600" /> Ditolak
                        </span>
                      )}
                      {item.status === 'Selesai' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" /> Selesai
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Lihat/Unduh Foto KTP */}
                        <button
                          onClick={() => setViewKtpItem(item)}
                          title="Lihat & Unduh Foto KTP Pemohon"
                          className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold transition border border-blue-200 flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-700" />
                          <span className="hidden md:inline">KTP</span>
                        </button>

                        {/* Tombol Kelola Status (Untuk Admin & Pejabat Pengesah) */}
                        {!isStaff && (
                          <button
                            id={`btn-edit-status-${item.id}`}
                            onClick={() => handleOpenEditModal(item)}
                            className="px-2.5 py-1.5 bg-[#0a2e1e] hover:bg-[#0d3d28] text-amber-400 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-sm"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{isSigner ? 'Acc / TTD' : 'Kelola Status'}</span>
                          </button>
                        )}

                        <button
                          id={`btn-cetak-t10-${item.id}`}
                          onClick={() => onViewDoc(item)}
                          title="Cetak Surat Izin T-10"
                          className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-xs font-bold transition border border-emerald-300"
                        >
                          <FileText className="w-4 h-4 text-emerald-800" />
                        </button>

                        {/* Tombol Hapus untuk Admin & Staff */}
                        {(isAdmin || isStaff) && (
                          <button
                            onClick={() => handleDeletePermohonan(item.id, item.nomorSurat)}
                            title="Hapus Data Kunjungan"
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-bold transition border border-red-300"
                          >
                            <Trash2 className="w-4 h-4 text-red-700" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL KELOLA STATUS PERMOHONAN */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0a2e1e] text-white px-6 py-4 flex justify-between items-center border-b border-white/10 shrink-0">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  VERIFIKASI & DISPOSISI · DIREKTORAT {(selectedItem.direktorat || 'Penuntutan').toUpperCase()}
                </span>
                <h3 className="text-base font-bold font-mono text-amber-300">
                  {selectedItem.nomorSurat}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><strong>Direktorat:</strong> <span className="text-emerald-800 font-bold">{selectedItem.direktorat || 'Penuntutan'}</span></p>
                <p><strong>Pemohon:</strong> {selectedItem.namaPemohon} ({selectedItem.hubungan})</p>
                <p><strong>Tahanan:</strong> {selectedItem.namaTahanan} - {selectedItem.satuanTahanan}</p>
                <p><strong>Rencana:</strong> {selectedItem.tanggalKunjungan} ({selectedItem.sesiKunjungan})</p>
                <p><strong>WhatsApp:</strong> {selectedItem.noWhatsApp}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status Permohonan:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Diproses', 'Disetujui', 'Ditolak', 'Selesai'] as StatusPermohonan[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                        editStatus === st
                          ? st === 'Disetujui'
                            ? 'bg-[#0a2e1e] text-amber-400 border-amber-500/40 shadow-sm'
                            : st === 'Ditolak'
                            ? 'bg-red-700 text-white border-red-800 shadow-sm'
                            : st === 'Selesai'
                            ? 'bg-blue-700 text-white border-blue-800 shadow-sm'
                            : 'bg-amber-600 text-white border-amber-700 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan / Pertimbangan Pejabat Penelaah:
                </label>
                <textarea
                  rows={3}
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Contoh: Berkas sah, surat kuasa advokat lengkap. Kunjungan diizinkan dengan pengawasan petugas piket RTM."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                ></textarea>
              </div>

              {/* Preview Foto KTP jika ada */}
              {selectedItem.fotoKTP && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Foto KTP Pemohon:</span>
                    <a
                      href={selectedItem.fotoKTP}
                      download={`KTP_${selectedItem.namaPemohon}_${selectedItem.nikPemohon}.png`}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-300"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh KTP
                    </a>
                  </div>
                  <div className="max-h-36 overflow-hidden rounded-lg border border-slate-300 bg-white flex items-center justify-center p-1">
                    <img src={selectedItem.fotoKTP} alt="KTP Pemohon" className="max-h-32 object-contain" />
                  </div>
                </div>
              )}

              {/* Penandatangan Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isSigner 
                    ? `Penandatangan Otomatis (${currentUser?.role}):` 
                    : `Pejabat Penandatangan T-10 (${selectedItem.direktorat === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas'}):`}
                </label>
                {isSigner ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1 text-xs">
                    <p className="font-bold text-emerald-950 text-sm">
                      {currentUser?.nama || "Pejabat Koneksitas"}
                    </p>
                    <p className="text-emerald-800">
                      <strong>Jabatan:</strong> {currentUser?.jabatan || currentUser?.role}
                    </p>
                    <p className="text-emerald-800 font-mono">
                      <strong>NIP / NRP:</strong> {currentUser?.nip || "-"}
                    </p>
                    <div className="flex items-center gap-2 pt-1 border-t border-emerald-200">
                      <span className="font-semibold text-emerald-900">E-Sign Digital:</span>
                      {currentUser?.fotoTandaTangan ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          ✓ Gambar TTD Siap Dibubuhkan
                          <img src={currentUser.fotoTandaTangan} alt="TTD" className="h-7 w-20 object-contain border rounded bg-white ml-2" />
                        </span>
                      ) : (
                        <span className="text-amber-700 italic text-[11px]">
                          (Tercatat secara digital atas nama Anda)
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedAkunId}
                      onChange={(e) => setSelectedAkunId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    >
                      <option value="">-- Pilih Pejabat Penandatangan --</option>
                      {akunList
                        .filter(a => !selectedItem.direktorat || a.direktorat === selectedItem.direktorat || a.role.includes('Koneksitas'))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            [{a.direktorat || 'Penuntutan'}] {a.nama} ({a.pangkat || a.role}) - NIP. {a.nip}
                          </option>
                        ))}
                    </select>
                    {selectedAkunId && (() => {
                      const sel = akunList.find(a => a.id === selectedAkunId);
                      return sel ? (
                        <div className="mt-2 p-2.5 bg-slate-100 rounded-lg text-xs text-slate-700 space-y-0.5">
                          <p><strong>Jabatan:</strong> {sel.jabatan}</p>
                          <p><strong>NIP:</strong> {sel.nip}</p>
                          <p className="flex items-center gap-2 mt-1">
                            <strong>E-Sign:</strong>
                            {sel.fotoTandaTangan ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                ✓ TTD Digital Siap
                                <img src={sel.fotoTandaTangan} alt="ttd" className="h-6 w-16 object-contain border rounded bg-white" />
                              </span>
                            ) : (
                              <span className="text-amber-700 italic">Belum ada upload gambar TTD</span>
                            )}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex items-start gap-2">
                <Phone className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Perubahan status ini akan <strong>secara otomatis memicu WhatsApp Gateway</strong> untuk mengirimkan notifikasi resmi kepada pemohon.
                </span>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                id="btn-simpan-status"
                type="button"
                disabled={isUpdating}
                onClick={handleSaveStatus}
                className="px-5 py-2 bg-[#0a2e1e] hover:bg-[#0d3d28] text-amber-400 rounded-xl text-xs font-bold transition shadow flex items-center gap-2"
              >
                {isUpdating ? 'Menyimpan...' : 'Simpan & Beritahu Pemohon'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIGURASI SISTEM INTEGRASI TERPISAH */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-emerald-950 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10 border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Konfigurasi Spreadsheet Terpisah & WhatsApp Gateway
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-300 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm text-slate-800">
              {/* Seksi 1A: Spreadsheet & GAS Direktorat Penuntutan */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs uppercase tracking-wider">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>1. Spreadsheet Direktorat PENUNTUTAN</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link Google Spreadsheet Penuntutan:
                  </label>
                  <input
                    type="url"
                    value={tempSettings.spreadsheetUrl || ''}
                    onChange={(e) => setTempSettings({ ...tempSettings, spreadsheetUrl: e.target.value })}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Webhook Google Apps Script (GAS) Penuntutan:
                  </label>
                  <input
                    type="url"
                    value={tempSettings.googleAppsScriptUrl}
                    onChange={(e) => setTempSettings({ ...tempSettings, googleAppsScriptUrl: e.target.value })}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-700"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestGasWebhook(tempSettings.googleAppsScriptUrl, false)}
                    disabled={testGasStatus.loading || !tempSettings.googleAppsScriptUrl}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {testGasStatus.loading ? 'Menguji...' : 'Uji Webhook Penuntutan'}
                  </button>
                  {testGasStatus.result && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                    </span>
                  )}
                </div>
              </div>

              {/* Seksi 1B: Spreadsheet & GAS Direktorat Penindakan */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-purple-950 text-xs uppercase tracking-wider">
                  <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                  <span>2. Spreadsheet Terpisah Direktorat PENINDAKAN</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link Google Spreadsheet Penindakan:
                  </label>
                  <input
                    type="url"
                    value={tempSettings.spreadsheetUrlPenindakan || ''}
                    onChange={(e) => setTempSettings({ ...tempSettings, spreadsheetUrlPenindakan: e.target.value })}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    URL Webhook Google Apps Script (GAS) Penindakan:
                  </label>
                  <input
                    type="url"
                    value={tempSettings.googleAppsScriptUrlPenindakan || ''}
                    onChange={(e) => setTempSettings({ ...tempSettings, googleAppsScriptUrlPenindakan: e.target.value })}
                    placeholder="https://script.google.com/macros/s/AKfycbx_penindakan.../exec"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-purple-700"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTestGasWebhook(tempSettings.googleAppsScriptUrlPenindakan || '', true)}
                    disabled={testGasPenindakanStatus.loading || !tempSettings.googleAppsScriptUrlPenindakan}
                    className="px-3.5 py-1.5 bg-purple-900 hover:bg-purple-950 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {testGasPenindakanStatus.loading ? 'Menguji...' : 'Uji Webhook Penindakan'}
                  </button>
                  {testGasPenindakanStatus.result && (
                    <span className="text-xs text-purple-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                    </span>
                  )}
                </div>
              </div>

              {/* Seksi Salin Script Universal */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                <span className="text-xs text-amber-900 font-medium">
                  Script GAS dapat dipasang di Google Sheets Penuntutan maupun Spreadsheet Penindakan.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                    alert('Kode Google Apps Script (GAS) berhasil disalin ke clipboard! Silakan paste pada menu Extensions > Apps Script di Spreadsheet Penuntutan atau Penindakan.');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" /> Salin Kode GAS
                </button>
              </div>

              {/* Seksi 3: WhatsApp Gateway Provider */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs uppercase tracking-wider">
                  <Phone className="w-4 h-4 text-emerald-700" />
                  <span>3. Integrasi WhatsApp Gateway</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Provider Gateway</label>
                    <select
                      value={tempSettings.waGatewayProvider}
                      onChange={(e) => setTempSettings({ ...tempSettings, waGatewayProvider: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="simulasi">Simulator Gateway Internal (Uji Coba Cepat)</option>
                      <option value="fonnte">Fonnte API (api.fonnte.com)</option>
                      <option value="wablas">Wablas API (api.wablas.com)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp Admin JAMPIDMIL</label>
                    <input
                      type="text"
                      value={tempSettings.waAdminPhone}
                      onChange={(e) => setTempSettings({ ...tempSettings, waAdminPhone: e.target.value })}
                      placeholder="081288009988"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Token API WhatsApp Gateway (Opsional untuk Simulator)
                    </label>
                    <input
                      type="password"
                      value={tempSettings.waApiKey}
                      onChange={(e) => setTempSettings({ ...tempSettings, waApiKey: e.target.value })}
                      placeholder="Masukkan Token API Fonnte / Wablas..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestWhatsApp}
                    disabled={testWaStatus.loading}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    {testWaStatus.loading ? 'Mengirim Pesan...' : 'Kirim Pesan Tes WhatsApp'}
                  </button>

                  {testWaStatus.result && (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {testWaStatus.result.detail || 'Sukses'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={isSavingSettings}
                onClick={handleSaveAllSettings}
                className="px-6 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold transition shadow"
              >
                {isSavingSettings ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW & UNDUH FOTO KTP PEMOHON */}
      {viewKtpItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                  VERIFIKASI IDENTITAS PEMOHON
                </span>
                <h3 className="text-sm font-bold text-white">
                  Foto KTP: {viewKtpItem.namaPemohon} ({viewKtpItem.nikPemohon})
                </h3>
              </div>
              <button
                onClick={() => setViewKtpItem(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-center">
              {viewKtpItem.fotoKTP ? (
                <>
                  <div className="border border-slate-300 rounded-xl p-2 bg-slate-50 flex items-center justify-center min-h-[220px]">
                    <img
                      src={viewKtpItem.fotoKTP}
                      alt={`KTP ${viewKtpItem.namaPemohon}`}
                      className="max-h-72 max-w-full object-contain rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="flex justify-center gap-3">
                    <a
                      href={viewKtpItem.fotoKTP}
                      download={`KTP_${viewKtpItem.namaPemohon}_${viewKtpItem.nikPemohon}.png`}
                      className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md"
                    >
                      <Download className="w-4 h-4" /> Unduh Gambar KTP
                    </a>
                    <button
                      onClick={() => setViewKtpItem(null)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      Tutup
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-10 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Foto KTP Tidak Diunggah</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Pemohon ini belum mengunggah foto / scan KTP saat mendaftar online.
                  </p>
                  <button
                    onClick={() => setViewKtpItem(null)}
                    className="mt-2 px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
