import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, Search, Eye, Download, RefreshCw, Lock,
  CheckCircle2, Clock, XCircle, UserCheck, Trash2, ArrowUp, ArrowDown
} from 'lucide-react';
import { PermohonanT10, StatusPermohonan, Direktorat } from '../types';
import { useNavigate } from 'react-router-dom';
import { SuratT10Viewer } from './SuratT10Viewer';
import { LoadingScreen } from './LoadingScreen';
import { DEFAULT_SETTINGS } from '../data/blueprintData';
import { formatIndonesianDate, compareNomorSurat } from '../utils/validation';

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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
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
      `"${p.nomorSurat}"`, `"${p.direktorat || 'Penuntutan'}"`, `"${p.createdAt}"`, `"${p.namaPemohon}"`,
      `"'${p.nikPemohon}"`, `"${p.noWhatsApp}"`, `"${p.hubungan}"`,
      `"${p.namaTahanan}"`, `"${p.lokasiRutan}"`, `"${p.tanggalKunjungan}"`,
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

  const filtered = useMemo(() => {
    const res = list.filter(p => {
      const matchDir = (p.direktorat || 'Penuntutan') === userDir;
      const q = searchQuery.toLowerCase().trim();
      const matchQ = !q ||
        p.namaPemohon.toLowerCase().includes(q) ||
        p.namaTahanan.toLowerCase().includes(q) ||
        p.nikPemohon.includes(q) ||
        p.nomorSurat.toLowerCase().includes(q) ||
        p.lokasiRutan.toLowerCase().includes(q);
      const matchS = filterStatus === 'Semua' || p.status === filterStatus;
      return matchDir && matchQ && matchS;
    });

    return [...res].sort((a, b) => {
      const cmp = compareNomorSurat(a.nomorSurat || '', b.nomorSurat || '');
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [list, userDir, searchQuery, filterStatus, sortOrder]);

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

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
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

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition shrink-0"
            title="Klik untuk mengubah urutan nomor surat (A-Z / Z-A)"
          >
            {sortOrder === 'asc' ? (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>Urut: B-1, B-2...</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-amber-700" />
                <span>Urut: Menurun</span>
              </>
            )}
          </button>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama pengunjung, tahanan, NIK..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
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
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  title="Urutkan berdasarkan nomor surat (klik untuk membalik urutan)"
                >
                  <div className="flex items-center gap-2">
                    <span>No. Surat</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-amber-400/30 group-hover:bg-emerald-900 transition">
                      {sortOrder === 'asc' ? (
                        <>
                          <ArrowUp className="w-3 h-3 text-amber-400" />
                          <span>Urut: B-1, B-2...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDown className="w-3 h-3 text-amber-400" />
                          <span>Urut: Z-A</span>
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
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">Tgl Kunjungan</th>
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
                filtered.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-emerald-50/40 transition`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap font-semibold">{p.nomorSurat}</td>
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

        {/* Footer info */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Menampilkan <strong>{filtered.length}</strong> dari <strong>{list.length}</strong> data kunjungan
            </span>
            <span className="text-xs text-slate-400">JAMPIDMIL — Kejaksaan RI</span>
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
