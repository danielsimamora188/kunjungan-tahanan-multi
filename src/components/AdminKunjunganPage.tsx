import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, Search, Eye, Download, RefreshCw, Lock,
  CheckCircle2, Clock, XCircle, UserCheck, Trash2, ArrowUp, ArrowDown,
  Filter, Calendar, Building, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PermohonanT10, StatusPermohonan, Direktorat } from '../types';
import { useNavigate } from 'react-router-dom';
import { SuratT10Viewer } from './SuratT10Viewer';
import { LoadingScreen } from './LoadingScreen';
import { DEFAULT_SETTINGS } from '../data/blueprintData';
import { formatIndonesianDate, compareNomorSurat, normalizeDateToYMD } from '../utils/validation';

const STATUS_STYLE: Record<string, string> = {
  'Diproses': 'bg-amber-100 text-amber-800 border-amber-200',
  'Disetujui': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Ditolak': 'bg-red-100 text-red-800 border-red-200',
  'Selesai': 'bg-blue-100 text-blue-800 border-blue-200',
};

export const AdminKunjunganPage: React.FC = () => {
  const [list, setList] = useState<PermohonanT10[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterDateTarget, setFilterDateTarget] = useState<'kunjungan' | 'pendaftaran'>('kunjungan');
  const [filterDateMode, setFilterDateMode] = useState<'semua' | 'hari_ini' | 'besok' | 'minggu_ini' | 'bulan_ini' | 'kustom'>('semua');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [filterSesi, setFilterSesi] = useState<string>('Semua');
  const [filterRutan, setFilterRutan] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'nomor_asc' | 'nomor_desc' | 'tgl_kunjungan_asc' | 'tgl_kunjungan_desc' | 'created_desc' | 'created_asc'>('nomor_asc');
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [viewingDoc, setViewingDoc] = useState<PermohonanT10 | null>(null);
  const [viewKtpItem, setViewKtpItem] = useState<PermohonanT10 | null>(null);
  const navigate = useNavigate();

  const currentUserStr = localStorage.getItem('userAccount');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserRole: string = currentUser?.role || '';
  const userDir: Direktorat = currentUser?.direktorat || 'Penuntutan';
  const isAdmin = currentUserRole === 'Admin';
  const isSigner = currentUserRole === 'Penuntut Umum Koneksitas' || currentUserRole === 'Penyidik Koneksitas';

  useEffect(() => { 
    fetchData(); 
  }, [userDir]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/permohonan?direktorat=${userDir}`, {
        headers: {
          'x-user-role': currentUserRole,
          'x-user-direktorat': userDir,
          'x-user-nip': currentUser?.nip || '',
        }
      });
      const json = await resp.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setList(json.data.sort((a: PermohonanT10, b: PermohonanT10) =>
          compareNomorSurat(a.nomorSurat || '', b.nomorSurat || '')
        ));
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const [deleteTarget, setDeleteTarget] = useState<PermohonanT10 | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/permohonan/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUserRole,
          'x-user-direktorat': userDir,
          'x-user-nip': currentUser?.nip || '',
        }
      });
      const json = await resp.json();
      if (json.status === 'success') {
        setDeleteTarget(null);
        fetchData();
      } else {
        alert(json.message || 'Gagal menghapus data.');
      }
    } catch (err) {
      alert('Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'No. Surat', 'Direktorat', 'Waktu Daftar', 'Nama Pengunjung', 'NIK', 'No WA',
      'Hubungan', 'Nama Tahanan', 'Tempat Ditahan', 'Tgl Kunjungan', 'Sesi',
      'Keperluan', 'Status',
    ];
    const rows = filtered.map(p => [
      `"${p.nomorSurat}"`, `"${p.direktorat || 'Penuntutan'}"`, `"${formatIndonesianDate(p.createdAt)}"`, `"${p.namaPemohon}"`,
      `"'${p.nikPemohon}"`, `"${p.noWhatsApp}"`, `"${p.hubungan}"`,
      `"${p.namaTahanan}"`, `"${p.lokasiRutan}"`, `"${formatIndonesianDate(p.tanggalKunjungan)}"`,
      `"${p.sesiKunjungan}"`, `"${p.keperluanKunjungan}"`, `"${p.status}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `data_kunjungan_${userDir.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper tanggal lokal (YYYY-MM-DD)
  const getTodayYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowYMD = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getNext7DaysYMD = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getStartOfMonthYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getEndOfMonthYMD = () => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  };

  // List Rutan unik sesuai direktorat
  const availableRutans = useMemo(() => {
    const dList = list.filter(p => (p.direktorat || 'Penuntutan') === userDir);
    const set = new Set<string>();
    dList.forEach(p => {
      if (p.lokasiRutan && p.lokasiRutan.trim()) {
        set.add(p.lokasiRutan.trim());
      }
    });
    return Array.from(set).sort();
  }, [list, userDir]);

  // Jumlah filter aktif di panel
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterDateMode !== 'semua' || filterDateStart || filterDateEnd) count++;
    if (filterSesi !== 'Semua') count++;
    if (filterRutan !== 'Semua') count++;
    if (sortBy !== 'nomor_asc') count++;
    return count;
  }, [filterDateMode, filterDateStart, filterDateEnd, filterSesi, filterRutan, sortBy]);

  const hasAnyFilter = useMemo(() => {
    return (
      filterStatus !== 'Semua' ||
      filterDateMode !== 'semua' ||
      Boolean(filterDateStart) ||
      Boolean(filterDateEnd) ||
      filterSesi !== 'Semua' ||
      filterRutan !== 'Semua' ||
      Boolean(searchQuery.trim()) ||
      sortBy !== 'nomor_asc'
    );
  }, [filterStatus, filterDateMode, filterDateStart, filterDateEnd, filterSesi, filterRutan, searchQuery, sortBy]);

  const resetAllFilters = () => {
    setFilterStatus('Semua');
    setFilterDateTarget('kunjungan');
    setFilterDateMode('semua');
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterSesi('Semua');
    setFilterRutan('Semua');
    setSearchQuery('');
    setSortBy('nomor_asc');
  };

  const filtered = useMemo(() => {
    const today = getTodayYMD();
    const tomorrow = getTomorrowYMD();
    const next7Days = getNext7DaysYMD();
    const startOfMonth = getStartOfMonthYMD();
    const endOfMonth = getEndOfMonthYMD();

    const res = list.filter(p => {
      const matchDir = (p.direktorat || 'Penuntutan') === userDir;
      if (!matchDir) return false;

      if (filterStatus !== 'Semua' && p.status !== filterStatus) return false;

      // Tanggal Filter (Kunjungan atau Pendaftaran)
      const targetDateRaw = filterDateTarget === 'pendaftaran' ? p.createdAt : p.tanggalKunjungan;
      const targetYMD = normalizeDateToYMD(targetDateRaw);

      if (filterDateMode === 'hari_ini') {
        if (!targetYMD || targetYMD !== today) return false;
      } else if (filterDateMode === 'besok') {
        if (!targetYMD || targetYMD !== tomorrow) return false;
      } else if (filterDateMode === 'minggu_ini') {
        if (!targetYMD || targetYMD < today || targetYMD > next7Days) return false;
      } else if (filterDateMode === 'bulan_ini') {
        if (!targetYMD || targetYMD < startOfMonth || targetYMD > endOfMonth) return false;
      } else if (filterDateMode === 'kustom' || filterDateStart || filterDateEnd) {
        const effStart = filterDateStart && filterDateEnd && filterDateStart > filterDateEnd ? filterDateEnd : filterDateStart;
        const effEnd = filterDateStart && filterDateEnd && filterDateStart > filterDateEnd ? filterDateStart : filterDateEnd;

        if (effStart && (!targetYMD || targetYMD < effStart)) return false;
        if (effEnd && (!targetYMD || targetYMD > effEnd)) return false;
      }

      if (filterSesi !== 'Semua') {
        if (!p.sesiKunjungan?.includes(filterSesi)) return false;
      }

      if (filterRutan !== 'Semua') {
        if (p.lokasiRutan !== filterRutan) return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchQ =
          p.namaPemohon.toLowerCase().includes(q) ||
          p.namaTahanan.toLowerCase().includes(q) ||
          p.nikPemohon.includes(q) ||
          p.nomorSurat.toLowerCase().includes(q) ||
          (p.lokasiRutan && p.lokasiRutan.toLowerCase().includes(q));
        if (!matchQ) return false;
      }

      return true;
    });

    return [...res].sort((a, b) => {
      if (sortBy === 'nomor_asc') {
        return compareNomorSurat(a.nomorSurat || '', b.nomorSurat || '');
      }
      if (sortBy === 'nomor_desc') {
        return compareNomorSurat(b.nomorSurat || '', a.nomorSurat || '');
      }
      if (sortBy === 'tgl_kunjungan_asc') {
        const dateA = normalizeDateToYMD(a.tanggalKunjungan);
        const dateB = normalizeDateToYMD(b.tanggalKunjungan);
        const cmpDate = dateA.localeCompare(dateB);
        if (cmpDate !== 0) return cmpDate;
        return compareNomorSurat(a.nomorSurat || '', b.nomorSurat || '');
      }
      if (sortBy === 'tgl_kunjungan_desc') {
        const dateA = normalizeDateToYMD(a.tanggalKunjungan);
        const dateB = normalizeDateToYMD(b.tanggalKunjungan);
        const cmpDate = dateB.localeCompare(dateA);
        if (cmpDate !== 0) return cmpDate;
        return compareNomorSurat(a.nomorSurat || '', b.nomorSurat || '');
      }
      if (sortBy === 'created_desc') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'created_asc') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      return compareNomorSurat(a.nomorSurat || '', b.nomorSurat || '');
    });
  }, [
    list,
    userDir,
    searchQuery,
    filterStatus,
    filterDateTarget,
    filterDateMode,
    filterDateStart,
    filterDateEnd,
    filterSesi,
    filterRutan,
    sortBy
  ]);

  // Pagination State (Maksimal 10 baris per halaman)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination ke halaman 1 saat filter atau sort berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterDateTarget, filterDateMode, filterDateStart, filterDateEnd, filterSesi, filterRutan, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedList = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, validCurrentPage]);

  const counts = {
    total: list.filter(p => (p.direktorat || 'Penuntutan') === userDir).length,
    diproses: list.filter(p => (p.direktorat || 'Penuntutan') === userDir && p.status === 'Diproses').length,
    disetujui: list.filter(p => (p.direktorat || 'Penuntutan') === userDir && p.status === 'Disetujui').length,
    ditolak: list.filter(p => (p.direktorat || 'Penuntutan') === userDir && p.status === 'Ditolak').length,
    selesai: list.filter(p => (p.direktorat || 'Penuntutan') === userDir && p.status === 'Selesai').length,
  };

  if (isSigner) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-2">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Akses Terbatas</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Halaman <strong>Data Kunjungan</strong> tidak tersedia untuk role <strong>{currentUserRole}</strong>.<br />
          Gunakan <strong>Dashboard</strong> untuk melihat dan menyetujui permohonan kunjungan Direktorat {userDir}.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen message={`Memuat Rekap Data Kunjungan (Direktorat ${userDir})...`} />;
  }

  return (
    <div className="space-y-6">
      {/* Modal View Surat T-10 */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <SuratT10Viewer
            permohonan={viewingDoc}
            settings={DEFAULT_SETTINGS}
            onBack={() => setViewingDoc(null)}
          />
        </div>
      )}

      {/* Modal View KTP */}
      {viewKtpItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
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
                  <p className="text-sm font-semibold text-slate-700">Foto KTP Tidak Diunggah</p>
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JAMPIDMIL · Kejaksaan RI</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Data Kunjungan Tahanan</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Rekap seluruh permohonan Surat Izin T-10 dan status kunjungan per direktorat.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-800 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="p-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-800" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Dedicated Directorate Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white px-5 py-3.5 rounded-2xl border border-emerald-800 shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Rekap Data Kunjungan</p>
            <h3 className="text-sm font-bold text-white">Direktorat {userDir} · JAMPIDMIL</h3>
          </div>
        </div>
        <div className="text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-slate-200">
          Total Permohonan: <strong className="text-amber-300 ml-1">{counts.total}</strong>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Total Kunjungan</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{counts.total}</span>
            <span className="text-[10px] text-slate-400">T-10</span>
          </div>
        </div>
        <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200/90 shadow-sm">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Diproses
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-950">{counts.diproses}</span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-200/70 px-1.5 py-0.5 rounded">Piket</span>
          </div>
        </div>
        <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200/90 shadow-sm">
          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Disetujui
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-950">{counts.disetujui}</span>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-200/70 px-1.5 py-0.5 rounded">Sah</span>
          </div>
        </div>
        <div className="bg-red-50/80 p-4 rounded-xl border border-red-200/90 shadow-sm">
          <span className="text-xs font-bold text-red-900 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-600" /> Ditolak
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-950">{counts.ditolak}</span>
            <span className="text-[10px] font-semibold text-red-700 bg-red-200/70 px-1.5 py-0.5 rounded">Gagal</span>
          </div>
        </div>
        <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200/90 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Selesai
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-950">{counts.selesai}</span>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-200/70 px-1.5 py-0.5 rounded">RTM</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3.5">
        {/* Row 1: Status Filter Tabs, Search Bar, Filter Toggle & Reset */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto shrink-0">
            {['Semua', 'Diproses', 'Disetujui', 'Ditolak', 'Selesai'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  filterStatus === st
                    ? 'bg-emerald-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {st} {st !== 'Semua' && `(${list.filter(p => (p.direktorat || 'Penuntutan') === userDir && p.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Search, Filter Button, and Reset */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nama pengunjung, tahanan, NIK..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Advanced Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition shrink-0 ${
                showFilterPanel || activeFilterCount > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
              title="Filter lanjutan (Tanggal, Sesi, Lokasi Rutan, Urutan)"
            >
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>Filter Data</span>
              {activeFilterCount > 0 && (
                <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Reset Filter Button */}
            {hasAnyFilter && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="flex items-center gap-1 px-2.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-medium text-red-700 transition shrink-0"
                title="Reset semua filter ke default"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Expandable Filter Panel */}
        {showFilterPanel && (
          <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl">
            {/* Filter 1: Tanggal Kunjungan / Pendaftaran (Mencakup 2 kolom di layar besar) */}
            <div className="md:col-span-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Filter Rentang Tanggal
                </label>
                {/* Target Tanggal: Kunjungan vs Pendaftaran */}
                <div className="flex items-center gap-1 text-[11px] bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFilterDateTarget('kunjungan')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      filterDateTarget === 'kunjungan'
                        ? 'bg-[#0a2e1e] text-amber-300 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tgl Kunjungan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDateTarget('pendaftaran')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${
                      filterDateTarget === 'pendaftaran'
                        ? 'bg-[#0a2e1e] text-amber-300 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tgl Pendaftaran
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setFilterDateMode('semua');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    filterDateMode === 'semua' && !filterDateStart && !filterDateEnd
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterDateMode('hari_ini');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    filterDateMode === 'hari_ini'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterDateMode('besok');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    filterDateMode === 'besok'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Besok
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterDateMode('minggu_ini');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    filterDateMode === 'minggu_ini'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  7 Hari ke Depan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterDateMode('bulan_ini');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    filterDateMode === 'bulan_ini'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>
              </div>

              {/* Date Range Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-600 font-bold block mb-0.5">Dari Tanggal:</span>
                  <input
                    type="date"
                    value={filterDateStart}
                    onChange={(e) => {
                      setFilterDateStart(e.target.value);
                      setFilterDateMode('kustom');
                    }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 font-bold block mb-0.5">Sampai Tanggal:</span>
                  <input
                    type="date"
                    value={filterDateEnd}
                    onChange={(e) => {
                      setFilterDateEnd(e.target.value);
                      setFilterDateMode('kustom');
                    }}
                    className="w-full text-xs p-1.5 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Filter 2: Sesi Kunjungan */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-700" /> Sesi Kunjungan
              </label>
              <select
                value={filterSesi}
                onChange={(e) => setFilterSesi(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="Semua">Semua Sesi</option>
                <option value="Pagi">Sesi Pagi (09.00 - 11.30 WIB)</option>
                <option value="Siang">Sesi Siang (13.30 - 15.30 WIB)</option>
              </select>
            </div>

            {/* Filter 3: Lokasi Rutan */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-emerald-700" /> Lokasi Rutan
              </label>
              <select
                value={filterRutan}
                onChange={(e) => setFilterRutan(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="Semua">Semua Lokasi Rutan</option>
                {availableRutans.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 4: Urutan Data (Sorting) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-emerald-700" /> Urutkan Data
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-700 focus:outline-none"
              >
                <option value="nomor_asc">Nomor Surat: B-1, B-2... (A-Z)</option>
                <option value="nomor_desc">Nomor Surat: Z-A (Menurun)</option>
                <option value="tgl_kunjungan_asc">Tanggal Kunjungan: Terdekat</option>
                <option value="tgl_kunjungan_desc">Tanggal Kunjungan: Terjauh</option>
                <option value="created_desc">Tanggal Pengajuan: Terbaru</option>
                <option value="created_asc">Tanggal Pengajuan: Terlama</option>
              </select>
            </div>
          </div>
        )}

        {/* Row 3: Filter Summary & Active Filter Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium">
              Menampilkan <strong className="text-slate-900 font-bold">{filtered.length}</strong> dari{' '}
              <strong className="text-slate-900 font-bold">{counts.total}</strong> permohonan
            </span>

            {/* Active filter badges */}
            {filterStatus !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-medium">
                Status: {filterStatus}
                <button type="button" onClick={() => setFilterStatus('Semua')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterDateMode === 'hari_ini' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-medium">
                {filterDateTarget === 'pendaftaran' ? 'Daftar ' : 'Kunjungan '}Hari Ini
                <button type="button" onClick={() => setFilterDateMode('semua')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterDateMode === 'besok' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-medium">
                {filterDateTarget === 'pendaftaran' ? 'Daftar ' : 'Kunjungan '}Besok
                <button type="button" onClick={() => setFilterDateMode('semua')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterDateMode === 'minggu_ini' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-medium">
                {filterDateTarget === 'pendaftaran' ? 'Daftar ' : 'Kunjungan '}7 Hari ke Depan
                <button type="button" onClick={() => setFilterDateMode('semua')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterDateMode === 'bulan_ini' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-medium">
                {filterDateTarget === 'pendaftaran' ? 'Daftar ' : 'Kunjungan '}Bulan Ini
                <button type="button" onClick={() => setFilterDateMode('semua')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filterDateMode === 'kustom' || filterDateStart || filterDateEnd) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-medium">
                {filterDateTarget === 'pendaftaran' ? 'Tgl Daftar: ' : 'Tgl Kunjungan: '}
                {filterDateStart ? filterDateStart : 'Awal'} s/d {filterDateEnd ? filterDateEnd : 'Akhir'}
                <button
                  type="button"
                  onClick={() => {
                    setFilterDateMode('semua');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                  }}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterSesi !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium">
                Sesi: {filterSesi}
                <button type="button" onClick={() => setFilterSesi('Semua')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterRutan !== 'Semua' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-medium">
                Rutan: {filterRutan}
                <button type="button" onClick={() => setFilterRutan('Semua')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {sortBy !== 'nomor_asc' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[11px] font-medium">
                Urut: {
                  sortBy === 'nomor_desc' ? 'Z-A' :
                  sortBy === 'tgl_kunjungan_asc' ? 'Tgl Kunjungan Terdekat' :
                  sortBy === 'tgl_kunjungan_desc' ? 'Tgl Kunjungan Terjauh' :
                  sortBy === 'created_desc' ? 'Terbaru' : 'Terlama'
                }
                <button type="button" onClick={() => setSortBy('nomor_asc')} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs underline underline-offset-2 ml-auto"
            >
              Hapus Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0a2e1e] text-slate-300 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th
                  className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-white transition group"
                  onClick={() => setSortBy((prev) => (prev === 'nomor_asc' ? 'nomor_desc' : 'nomor_asc'))}
                  title="Urutkan berdasarkan nomor surat (klik untuk membalik urutan B-1, B-2...)"
                >
                  <div className="flex items-center gap-2">
                    <span>No. Surat</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-amber-400/30 group-hover:bg-emerald-900 transition">
                      {sortBy === 'nomor_asc' ? (
                        <>
                          <ArrowUp className="w-3 h-3 text-amber-400" />
                          <span>Urut: B-1, B-2...</span>
                        </>
                      ) : sortBy === 'nomor_desc' ? (
                        <>
                          <ArrowDown className="w-3 h-3 text-amber-400" />
                          <span>Urut: Menurun</span>
                        </>
                      ) : (
                        <>
                          <Filter className="w-3 h-3 text-amber-400" />
                          <span>Urut Khusus</span>
                        </>
                      )}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Direktorat</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Nama Pengunjung</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">NIK</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Hubungan</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Nama Tahanan</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Tempat Ditahan</th>
                <th
                  className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-white transition group"
                  onClick={() => setSortBy((prev) => (prev === 'tgl_kunjungan_asc' ? 'tgl_kunjungan_desc' : 'tgl_kunjungan_asc'))}
                  title="Urutkan berdasarkan tanggal kunjungan"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tgl Kunjungan</span>
                    {sortBy === 'tgl_kunjungan_asc' && <ArrowUp className="w-3 h-3 text-amber-400" />}
                    {sortBy === 'tgl_kunjungan_desc' && <ArrowDown className="w-3 h-3 text-amber-400" />}
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Sesi</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="text-center py-14 text-slate-400">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-slate-300" />
                    <p>Memuat data kunjungan...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-14 text-slate-400">
                    <ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-500">Tidak ada data kunjungan</p>
                    <p className="text-xs mt-1">Coba ubah filter atau kata pencarian.</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-emerald-50/40 transition`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-mono text-xs text-slate-800 font-semibold">{p.nomorSurat}</p>
                      {p.createdAt && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatIndonesianDate(p.createdAt)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {p.direktorat || 'Penuntutan'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{p.namaPemohon}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{p.nikPemohon}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{p.hubungan}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{p.namaTahanan}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[150px]">{p.lokasiRutan}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-xs">
                      {formatIndonesianDate(p.tanggalKunjungan)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {p.sesiKunjungan === 'Sesi Pagi (09.00 - 11.30 WIB)' ? '🌅 Pagi' : '☀️ Siang'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingDoc(p)}
                          className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold hover:underline transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Surat
                        </button>
                        <button
                          onClick={() => setViewKtpItem(p)}
                          className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline transition"
                        >
                          <Download className="w-3.5 h-3.5" /> KTP
                        </button>
                        {(isAdmin || currentUserRole === 'Staff') && (
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold hover:underline transition ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
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

        {/* Pagination Section (Maksimal 10 Baris) */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Menampilkan{' '}
              <strong className="font-bold text-slate-900">
                {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}
              </strong>{' '}
              -{' '}
              <strong className="font-bold text-slate-900">
                {Math.min(validCurrentPage * ITEMS_PER_PAGE, filtered.length)}
              </strong>{' '}
              dari <strong className="font-bold text-slate-900">{filtered.length}</strong> data
              <span className="text-slate-400 ml-1.5 hidden sm:inline">(Maks. 10 baris per halaman)</span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={validCurrentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (
                      totalPages > 7 &&
                      pageNum !== 1 &&
                      pageNum !== totalPages &&
                      Math.abs(pageNum - validCurrentPage) > 1
                    ) {
                      if (
                        pageNum === validCurrentPage - 2 ||
                        pageNum === validCurrentPage + 2
                      ) {
                        return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition ${
                          validCurrentPage === pageNum
                            ? 'bg-[#0a2e1e] text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-semibold"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Permohonan Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">Hapus Data Permohonan?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Apakah Anda yakin ingin menghapus permohonan No. <strong className="text-slate-900">{deleteTarget.nomorSurat}</strong> atas nama pemohon <strong className="text-slate-900">{deleteTarget.namaPemohon}</strong> (Tahanan: {deleteTarget.namaTahanan})?
                </p>
                <p className="text-[11px] text-red-600 font-medium mt-1.5">
                  *Tindakan ini akan menghapus data dari sistem dan menyinkronkan ke Spreadsheet.
                </p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permohonan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
