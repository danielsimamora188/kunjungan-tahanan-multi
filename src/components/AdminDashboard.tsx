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
  ChevronLeft,
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
  Building2,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PermohonanT10, StatusPermohonan, SystemSettings, Direktorat } from '../types';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/blueprintData';
import { formatIndonesianDate, compressBase64Image, compareNomorSurat, normalizeDateToYMD } from '../utils/validation';

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

  // Signer explicit form states for ACC / Approval
  const [signerNama, setSignerNama] = useState('');
  const [signerPangkat, setSignerPangkat] = useState('');
  const [signerNip, setSignerNip] = useState('');
  const [signerTipeId, setSignerTipeId] = useState<'NIP' | 'NRP'>('NIP');
  const [signerJabatan, setSignerJabatan] = useState('');
  const [signerTtdUrl, setSignerTtdUrl] = useState('');
  const modalSignatureRef = React.useRef<HTMLInputElement>(null);

  const loggedInUserRaw = localStorage.getItem('userAccount');
  const currentUser = loggedInUserRaw ? JSON.parse(loggedInUserRaw) : null;
  const isStaff = currentUser?.role === 'Staff';
  const isPUK = currentUser?.role === 'Penuntut Umum Koneksitas';
  const isPenyidik = currentUser?.role === 'Penyidik Koneksitas';
  const isSigner = isPUK || isPenyidik;
  const isAdmin = currentUser?.role === 'Admin';

  const userDir: Direktorat = currentUser?.direktorat || 'Penuntutan';

  React.useEffect(() => {
    setActiveTabDir(userDir);

    fetch(`/api/akun?direktorat=${userDir}`, {
      headers: {
        'x-user-role': currentUser?.role || '',
        'x-user-direktorat': userDir,
        'x-user-nip': currentUser?.nip || '',
      }
    })
      .then(r => r.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          setAkunList(json.data);
        }
      })
      .catch(() => { });
  }, [userDir]);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<SystemSettings>({ ...systemSettings });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [testGasStatus, setTestGasStatus] = useState<{ loading: boolean; result?: any; error?: string }>({ loading: false });
  const [testGasPenindakanStatus, setTestGasPenindakanStatus] = useState<{ loading: boolean; result?: any; error?: string }>({ loading: false });
  const [testWaStatus, setTestWaStatus] = useState<{ loading: boolean; result?: any; error?: string }>({ loading: false });

  // Filter & Sort States
  const [filterDateTarget, setFilterDateTarget] = useState<'kunjungan' | 'pendaftaran'>('kunjungan');
  const [filterDateMode, setFilterDateMode] = useState<'semua' | 'hari_ini' | 'besok' | 'minggu_ini' | 'bulan_ini' | 'kustom'>('semua');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [filterSesi, setFilterSesi] = useState<string>('Semua');
  const [filterRutan, setFilterRutan] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'nomor_asc' | 'nomor_desc' | 'tgl_kunjungan_asc' | 'tgl_kunjungan_desc' | 'created_desc' | 'created_asc'>('nomor_asc');
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);

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
    const list = permohonanList.filter(p => (p.direktorat || 'Penuntutan') === userDir);
    const set = new Set<string>();
    list.forEach(p => {
      if (p.lokasiRutan && p.lokasiRutan.trim()) {
        set.add(p.lokasiRutan.trim());
      }
    });
    return Array.from(set).sort();
  }, [permohonanList, userDir]);

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

  // Filtered List - SESUAI DIREKTORAT, FILTER KRITERIA, & SORTING
  const filteredList = useMemo(() => {
    const today = getTodayYMD();
    const tomorrow = getTomorrowYMD();
    const next7Days = getNext7DaysYMD();
    const startOfMonth = getStartOfMonthYMD();
    const endOfMonth = getEndOfMonthYMD();

    const list = permohonanList.filter((item) => {
      // 1. Direktorat
      const matchDir = (item.direktorat || 'Penuntutan') === userDir;
      if (!matchDir) return false;

      // 2. Status
      if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;

      // 3. Tanggal Filter (Kunjungan atau Pendaftaran)
      const targetDateRaw = filterDateTarget === 'pendaftaran' ? item.createdAt : item.tanggalKunjungan;
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

      // 4. Sesi Kunjungan
      if (filterSesi !== 'Semua') {
        if (!item.sesiKunjungan?.includes(filterSesi)) return false;
      }

      // 5. Lokasi Rutan
      if (filterRutan !== 'Semua') {
        if (item.lokasiRutan !== filterRutan) return false;
      }

      // 6. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchQuery =
          item.nomorSurat.toLowerCase().includes(q) ||
          item.nikPemohon.includes(q) ||
          item.namaPemohon.toLowerCase().includes(q) ||
          item.namaTahanan.toLowerCase().includes(q) ||
          item.satuanTahanan.toLowerCase().includes(q) ||
          (item.lokasiRutan && item.lokasiRutan.toLowerCase().includes(q)) ||
          item.noWhatsApp.includes(q);
        if (!matchQuery) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
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
    permohonanList,
    userDir,
    filterStatus,
    filterDateTarget,
    filterDateMode,
    filterDateStart,
    filterDateEnd,
    filterSesi,
    filterRutan,
    searchQuery,
    sortBy
  ]);

  // Pagination State (Maksimal 10 baris per halaman)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination ke halaman 1 saat filter atau sort berubah
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterDateTarget, filterDateMode, filterDateStart, filterDateEnd, filterSesi, filterRutan, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedList = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredList, validCurrentPage]);

  // Metric Counters - STRICTLY FOR USER DIREKTORAT
  const counts = useMemo(() => {
    const list = permohonanList.filter(p => (p.direktorat || 'Penuntutan') === userDir);
    return {
      total: list.length,
      diproses: list.filter((p) => p.status === 'Diproses').length,
      disetujui: list.filter((p) => p.status === 'Disetujui').length,
      ditolak: list.filter((p) => p.status === 'Ditolak').length,
      selesai: list.filter((p) => p.status === 'Selesai').length,
    };
  }, [permohonanList, userDir]);

  const handleOpenEditModal = (item: PermohonanT10) => {
    setSelectedItem(item);
    setEditStatus(item.status);
    setEditCatatan(item.catatanPetugas || '');
    setEditPetugas(item.namaPetugasPemeriksa || currentUser?.nama || 'Petugas JAMPIDMIL');

    const itemDir = item.direktorat || 'Penuntutan';
    const expectedRole = itemDir === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas';

    const cleanVal = (v: any) => (!v || v === '-' || v === 'undefined' || v === 'null') ? '' : String(v).trim();

    if (isSigner) {
      // 100% Otomatis ambil data dari akun Penyidik / Penuntut yang sedang login
      const myAkun = akunList.find(a => (a.nip && a.nip === currentUser?.nip) || (a.username && a.username === currentUser?.username) || a.nama === currentUser?.nama) || currentUser;

      const officialNama = cleanVal(myAkun?.nama) || cleanVal(currentUser?.nama) || cleanVal(item.penandatanganNama) || 'Pejabat Koneksitas';
      const officialPangkat = cleanVal(myAkun?.pangkat) || cleanVal(currentUser?.pangkat) || cleanVal(item.penandatanganPangkat) || (itemDir === 'Penindakan' ? 'Jaksa Madya (IV/a)' : 'Jaksa Utama Muda (IV/c)');
      const officialNip = cleanVal(myAkun?.nip) || cleanVal(currentUser?.nip) || cleanVal(item.penandatanganNip) || '';
      const officialTipeId = (myAkun?.tipeIdentitas as any) || (currentUser?.tipeIdentitas as any) || (item.penandatanganTipeIdentitas as any) || 'NIP';
      const officialJabatan = cleanVal(myAkun?.jabatan) || cleanVal(currentUser?.jabatan) || cleanVal(item.penandatanganJabatan) || (itemDir === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas');
      const officialTtd = cleanVal(myAkun?.fotoTandaTangan) || cleanVal(currentUser?.fotoTandaTangan) || cleanVal(item.penandatanganTtdUrl) || '';

      setSignerNama(officialNama);
      setSignerPangkat(officialPangkat);
      setSignerNip(officialNip);
      setSignerTipeId(officialTipeId);
      setSignerJabatan(officialJabatan);
      setSignerTtdUrl(officialTtd);
    } else {
      // Jika Admin / Staff, pilih akun pejabat direktorat yang sesuai secara otomatis
      const matched = akunList.find(a => cleanVal(item.penandatanganNama) && a.nama === item.penandatanganNama)
        || akunList.find(a => a.role === expectedRole && (a.direktorat || 'Penuntutan') === itemDir)
        || akunList.find(a => a.role === expectedRole)
        || akunList[0];

      if (matched) {
        setSelectedAkunId(matched.id);
        setSignerNama(cleanVal(item.penandatanganNama) || cleanVal(matched.nama) || '');
        setSignerPangkat(cleanVal(item.penandatanganPangkat) || cleanVal(matched.pangkat) || (itemDir === 'Penindakan' ? 'Jaksa Madya (IV/a)' : 'Jaksa Utama Muda (IV/c)'));
        setSignerNip(cleanVal(item.penandatanganNip) || cleanVal(matched.nip) || '');
        setSignerTipeId((item.penandatanganTipeIdentitas as any) || (matched.tipeIdentitas as any) || 'NIP');
        setSignerJabatan(cleanVal(item.penandatanganJabatan) || cleanVal(matched.jabatan) || (itemDir === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas'));
        setSignerTtdUrl(cleanVal(item.penandatanganTtdUrl) || cleanVal(matched.fotoTandaTangan) || '');
      }
    }
  };

  const handleSelectSignerAkun = (akunId: string) => {
    setSelectedAkunId(akunId);
    const sel = akunList.find(a => a.id === akunId);
    if (sel) {
      const cleanVal = (v: any) => (!v || v === '-' || v === 'undefined' || v === 'null') ? '' : String(v).trim();
      setSignerNama(cleanVal(sel.nama) || '');
      setSignerPangkat(cleanVal(sel.pangkat) || (selectedItem?.direktorat === 'Penindakan' ? 'Jaksa Madya (IV/a)' : 'Jaksa Utama Muda (IV/c)'));
      setSignerNip(cleanVal(sel.nip) || '');
      setSignerTipeId(sel.tipeIdentitas || 'NIP');
      setSignerJabatan(cleanVal(sel.jabatan) || (selectedItem?.direktorat === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas'));
      setSignerTtdUrl(cleanVal(sel.fotoTandaTangan) || '');
    }
  };

  const handleModalTtdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const compressed = await compressBase64Image(raw, 500, 500, 0.6);
      setSignerTtdUrl(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStatus = async () => {
    if (!selectedItem) return;

    setIsUpdating(true);
    try {
      const itemDir = selectedItem.direktorat || 'Penuntutan';
      const defaultRole = itemDir === 'Penindakan' ? "Penyidik Koneksitas" : "Penuntut Umum Koneksitas";

      const penandatanganData = {
        nama: signerNama.trim() || currentUser?.nama || (isSigner ? currentUser?.role : "Pejabat Koneksitas"),
        pangkat: signerPangkat.trim() || "Jaksa Madya (IV/a)",
        nip: signerNip.trim() || currentUser?.nip || "",
        tipeIdentitas: signerTipeId || "NIP",
        jabatan: signerJabatan.trim() || defaultRole,
        ttdUrl: signerTtdUrl,
      };

      await onUpdateStatus(
        selectedItem.id,
        editStatus,
        editCatatan,
        penandatanganData.nama,
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
  const [deleteTarget, setDeleteTarget] = useState<PermohonanT10 | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const handleDeletePermohonan = (item: PermohonanT10) => {
    setDeleteTarget(item);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/permohonan/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser?.role || '',
          'x-user-direktorat': userDir,
          'x-user-nip': currentUser?.nip || '',
        }
      });
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

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      const resp = await fetch('/api/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || '',
          'x-user-direktorat': userDir,
          'x-user-nip': currentUser?.nip || '',
        },
        body: JSON.stringify({ direktorat: userDir })
      });
      const json = await resp.json();
      if (json.status === 'success') {
        const msg = `Integrasi Berhasil: ${json.counts?.permohonan || 0} Permohonan, ${json.counts?.tahanan || 0} Tahanan, dan ${json.counts?.akun || 0} Akun disinkronkan ke Spreadsheet Direktorat ${userDir}.`;
        setSyncSuccess(msg);
        await onRefresh();
        setTimeout(() => setSyncSuccess(null), 5000);
      } else {
        alert(json.message || 'Gagal sinkronisasi data.');
      }
    } catch (err: any) {
      alert(`Terjadi kesalahan sinkronisasi: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
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

      {/* Sync Success Toast */}
      {syncSuccess && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 text-amber-300 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in text-sm font-semibold border border-amber-500/50 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-white text-xs">{syncSuccess}</span>
          <button onClick={() => setSyncSuccess(null)} className="ml-auto text-amber-400 hover:text-white transition">
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

      {/* Dedicated Directorate Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white px-5 py-4 rounded-2xl border border-emerald-800 shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-400/30">
                Wilayah Kerja Terisolasi
              </span>
              <span className="text-xs text-slate-300">Role: <strong className="text-white">{currentUser?.role}</strong></span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              Direktorat {userDir} · JAMPIDMIL Kejaksaan RI
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-slate-200">
          <span>Permohonan Terdaftar:</span>
          <strong className="text-amber-300 text-sm font-bold">{counts.total}</strong>
        </div>
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

      {/* Filter & Search Bar Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3.5">
        {/* Row 1: Status Filter Tabs, Search Bar, Filter Toggle & Reset */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto shrink-0">
            {['Semua', 'Diproses', 'Disetujui', 'Ditolak', 'Selesai'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${filterStatus === st
                  ? 'bg-[#0a2e1e] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
              >
                {st} {st !== 'Semua' && `(${permohonanList.filter((p) => {
                  const matchDir = (p.direktorat || 'Penuntutan') === userDir;
                  return matchDir && p.status === st;
                }).length})`}
              </button>
            ))}
          </div>

          {/* Search Bar, Filter Toggle & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. Surat, NIK, Pemohon..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] focus:bg-white transition"
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
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition shrink-0 ${showFilterPanel || activeFilterCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
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

        {/* Row 2: Expandable Advanced Filter Panel */}
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
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${filterDateTarget === 'kunjungan'
                      ? 'bg-[#0a2e1e] text-amber-300 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Tgl Kunjungan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDateTarget('pendaftaran')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition ${filterDateTarget === 'pendaftaran'
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterDateMode === 'semua' && !filterDateStart && !filterDateEnd
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterDateMode === 'hari_ini'
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterDateMode === 'besok'
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterDateMode === 'minggu_ini'
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterDateMode === 'bulan_ini'
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
              Menampilkan <strong className="text-slate-900 font-bold">{filteredList.length}</strong> dari{' '}
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

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200/90 overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-bold text-slate-800">Data Permohonan Kunjungan</span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              {filteredList.length} data
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:block">Diurutkan: {sortBy === 'nomor_asc' ? 'B-1, B-2...' : sortBy === 'nomor_desc' ? 'Menurun' : sortBy === 'tgl_kunjungan_asc' ? 'Tgl Kunjungan Terdekat' : sortBy === 'tgl_kunjungan_desc' ? 'Tgl Kunjungan Terjauh' : sortBy === 'created_desc' ? 'Terbaru' : 'Terlama'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#0a2e1e] text-slate-300">
                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-10 text-center">#</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none hover:text-white transition group"
                  onClick={() => setSortBy((prev) => (prev === 'nomor_asc' ? 'nomor_desc' : 'nomor_asc'))}
                  title="Klik untuk membalik urutan"
                >
                  <div className="flex items-center gap-1.5">
                    <span>No. Surat T-10</span>
                    {sortBy === 'nomor_asc' && <ArrowUp className="w-3 h-3 text-amber-400" />}
                    {sortBy === 'nomor_desc' && <ArrowDown className="w-3 h-3 text-amber-400" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Pemohon</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Tahanan</th>
                <th
                  className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer select-none hover:text-white transition group"
                  onClick={() => setSortBy((prev) => (prev === 'tgl_kunjungan_asc' ? 'tgl_kunjungan_desc' : 'tgl_kunjungan_asc'))}
                  title="Klik untuk mengurutkan berdasarkan tanggal kunjungan"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Jadwal Kunjungan</span>
                    {sortBy === 'tgl_kunjungan_asc' && <ArrowUp className="w-3 h-3 text-amber-400" />}
                    {sortBy === 'tgl_kunjungan_desc' && <ArrowDown className="w-3 h-3 text-amber-400" />}
                  </div>
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-slate-300" />
                      </div>
                      <p className="font-bold text-slate-600 text-sm">Tidak ada data ditemukan</p>
                      <p className="text-xs text-slate-400">Coba ubah filter atau kata kunci pencarian</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const rowNum = (validCurrentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  const isEven = idx % 2 === 1;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 transition-colors duration-150 hover:bg-emerald-50/40 ${isEven ? 'bg-slate-50/60' : 'bg-white'
                        }`}
                    >
                      {/* Row Number */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-[11px] font-bold text-slate-400 tabular-nums">{rowNum}</span>
                      </td>

                      {/* No Surat T-10 */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-8 rounded-full shrink-0 bg-amber-400"></div>
                          <div>
                            <p className="font-mono font-extrabold text-emerald-900 text-[13px] leading-tight tracking-tight">
                              {item.nomorSurat}
                            </p>
                            <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                              {formatIndonesianDate(item.createdAt)}
                            </p>
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded mt-0.5 bg-slate-100 text-slate-600 border border-slate-200">
                              {item.direktorat || 'Penuntutan'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Data Pemohon */}
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 text-[13px] leading-tight">{item.namaPemohon}</p>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5">NIK: {item.nikPemohon}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-medium">
                            <Users className="w-2.5 h-2.5" />
                            {item.hubungan}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-medium">
                            <Phone className="w-2.5 h-2.5" />
                            {item.noWhatsApp}
                          </span>
                        </div>
                      </td>

                      {/* Tahanan*/}
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 text-[13px] leading-tight">{item.namaTahanan}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{item.pangkatNrpTahanan}</p>
                        <p className="text-[10px] text-emerald-800 font-bold mt-0.5 flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" />
                          {item.satuanTahanan}
                        </p>
                      </td>

                      {/* Jadwal & Lokasi */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-bold text-slate-900 text-[13px] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-700 shrink-0" />
                          {formatIndonesianDate(item.tanggalKunjungan)}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 ml-4">{item.sesiKunjungan}</p>
                        <p className="text-[10px] text-slate-600 truncate max-w-[150px] mt-0.5 ml-4 flex items-center gap-1" title={item.lokasiRutan}>
                          <Building className="w-2.5 h-2.5 shrink-0" />
                          {item.lokasiRutan}
                        </p>
                      </td>

                      {/* Status Permohonan */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {item.status === 'Disetujui' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Disetujui
                          </span>
                        )}
                        {item.status === 'Diproses' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Diproses
                          </span>
                        )}
                        {item.status === 'Ditolak' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-red-50 text-red-800 border border-red-200 shadow-sm">
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                            Ditolak
                          </span>
                        )}
                        {item.status === 'Selesai' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                            Selesai
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewKtpItem(item)}
                            title="Lihat & Unduh Foto KTP Pemohon"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition border border-blue-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isStaff && (
                            <button
                              id={`btn-edit-status-${item.id}`}
                              onClick={() => handleOpenEditModal(item)}
                              title={isSigner ? 'Acc / TTD' : 'Kelola Status'}
                              className="px-2.5 py-1.5 bg-[#0a2e1e] hover:bg-[#0d3d28] text-amber-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">{isSigner ? 'Acc/TTD' : 'Kelola'}</span>
                            </button>
                          )}

                          <button
                            id={`btn-cetak-t10-${item.id}`}
                            onClick={() => onViewDoc(item)}
                            title="Cetak Surat Izin T-10"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition border border-emerald-200"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {(isAdmin || isStaff) && (
                            <button
                              onClick={() => handleDeletePermohonan(item)}
                              title="Hapus Data Kunjungan"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition border border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section (Maksimal 10 Baris) */}
        {filteredList.length > 0 && (
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Menampilkan{' '}
              <strong className="font-bold text-emerald-900">
                {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredList.length)}
              </strong>{' '}
              dari{' '}
              <strong className="font-bold text-slate-900">{filteredList.length}</strong> data
              {totalPages > 1 && (
                <span className="text-slate-400 ml-1.5 hidden sm:inline">
                  · Hal. {validCurrentPage} / {totalPages}
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={validCurrentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 text-xs font-semibold shadow-sm"
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
                      if (pageNum === validCurrentPage - 2 || pageNum === validCurrentPage + 2) {
                        return <span key={pageNum} className="px-1 text-slate-400 text-xs">…</span>;
                      }
                      return null;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition shadow-sm ${validCurrentPage === pageNum
                          ? 'bg-[#0a2e1e] text-amber-300 shadow-md'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300'
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
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 text-xs font-semibold shadow-sm"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
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
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${editStatus === st
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

              {/* Penandatangan & E-Sign Section */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {isSigner
                      ? `Pengesahan T-10 (${currentUser?.role}):`
                      : `Pejabat Penandatangan T-10 (${selectedItem.direktorat === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas'}):`}
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Direktorat {selectedItem.direktorat || 'Penuntutan'}
                  </span>
                </div>

                {!isSigner && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Pilih dari Master Akun Pejabat:
                    </label>
                    <select
                      value={selectedAkunId}
                      onChange={(e) => handleSelectSignerAkun(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
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
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Lengkap Pejabat:
                    </label>
                    <input
                      type="text"
                      value={signerNama}
                      onChange={e => setSignerNama(e.target.value)}
                      placeholder="Contoh: Bambang Triyono, S.H., M.H."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pangkat / Golongan:
                    </label>
                    <input
                      type="text"
                      value={signerPangkat}
                      onChange={e => setSignerPangkat(e.target.value)}
                      placeholder="Contoh: Jaksa Madya (IV/a)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      NIP / NRP:
                    </label>
                    <input
                      type="text"
                      value={signerNip}
                      onChange={e => setSignerNip(e.target.value)}
                      placeholder="NIP atau NRP Pejabat..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jabatan Naskah Dinas:
                    </label>
                    <input
                      type="text"
                      value={signerJabatan}
                      onChange={e => setSignerJabatan(e.target.value)}
                      placeholder={selectedItem.direktorat === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas'}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                {/* Upload Gambar Tanda Tangan */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Gambar Tanda Tangan (PNG / JPG Transparan):
                    </span>
                    <input
                      type="file"
                      ref={modalSignatureRef}
                      onChange={handleModalTtdUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => modalSignatureRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 rotate-180" />
                      {signerTtdUrl ? 'Ganti Gambar TTD' : 'Unggah Gambar TTD'}
                    </button>
                  </div>

                  {signerTtdUrl ? (
                    <div className="p-2 bg-white border border-emerald-300 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <img src={signerTtdUrl} alt="Preview TTD" className="h-10 max-w-[120px] object-contain border rounded bg-slate-50 p-1" />
                        <div>
                          <p className="text-xs font-bold text-emerald-900">Gambar TTD Siap Dibubuhkan</p>
                          <p className="text-[10px] text-slate-500">Akan dicetak pada dokumen Surat T-10</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSignerTtdUrl('')}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                      <span>⚠️ Belum ada file gambar tanda tangan. Klik tombol di atas untuk mengunggah.</span>
                    </div>
                  )}
                </div>
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
              {/* Seksi 1A: Spreadsheet & GAS Direktorat Penuntutan (Khusus Admin Penuntutan) */}
              {userDir === 'Penuntutan' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-xs uppercase tracking-wider">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                    <span>Spreadsheet & Webhook Direktorat PENUNTUTAN</span>
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
              )}

              {/* Seksi 1B: Spreadsheet & GAS Direktorat Penindakan (Khusus Admin Penindakan) */}
              {userDir === 'Penindakan' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-purple-950 text-xs uppercase tracking-wider">
                    <FileSpreadsheet className="w-4 h-4 text-purple-700" />
                    <span>Spreadsheet & Webhook Direktorat PENINDAKAN</span>
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
              )}

              {/* Seksi Sinkronisasi Instan */}
              <div className="p-4 bg-emerald-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-emerald-700 shadow-sm">
                <div>
                  <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" /> Sinkronisasi 3 Modul ke Spreadsheet
                  </h4>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Kirim seluruh data lokal (Permohonan, Master Tahanan, dan Akun) ke Google Sheets Direktorat {userDir}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={isSyncingAll}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs rounded-lg transition shrink-0 disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  {isSyncingAll ? 'Sedang Menyinkronkan...' : 'Sinkronkan Sekarang'}
                </button>
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

      {/* Delete Permohonan Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">Hapus Permohonan T-10?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Apakah Anda yakin ingin menghapus permohonan kunjungan No. <strong className="text-slate-900">{deleteTarget.nomorSurat}</strong> atas nama pemohon <strong className="text-slate-900">{deleteTarget.namaPemohon}</strong> (Tahanan: {deleteTarget.namaTahanan})?
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
                onClick={cancelDelete}
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
