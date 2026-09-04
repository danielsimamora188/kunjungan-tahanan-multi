import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Shield, Clock, CheckCircle2, XCircle, AlertCircle, User, Calendar, MapPin, ExternalLink, ArrowRight, Building2, X, Loader2, FileText } from 'lucide-react';
import { PermohonanT10, StatusPermohonan, Direktorat } from '../types';
import { formatIndonesianDate } from '../utils/validation';

interface TrackingViewProps {
  initialQuery?: string;
  direktorat?: Direktorat;
  onViewDoc?: (permohonan: PermohonanT10) => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({
  initialQuery = '',
  direktorat: fixedDirektorat,
  onViewDoc,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDirektorat, setSelectedDirektorat] = useState<string>(fixedDirektorat || 'Semua');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PermohonanT10[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (queryToSearch: string, dirFilter = selectedDirektorat) => {
    const clean = queryToSearch.trim();
    if (!clean) {
      setSearchResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      params.set('q', clean);
      if (dirFilter && dirFilter !== 'Semua') {
        params.set('direktorat', dirFilter);
      }

      const response = await fetch(`/api/permohonan?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setSearchResults(data.data || []);
      } else {
        setErrorMessage(data.message || 'Gagal memuat data pencarian.');
        setSearchResults([]);
      }
    } catch (err: any) {
      setErrorMessage('Terjadi gangguan koneksi ke server.');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDirektorat]);

  // Initial query search effect
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  // Live debounced search as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    // Debounce search by 350ms
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value, selectedDirektorat);
    }, 350);
  };

  // Immediate search on form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    performSearch(searchQuery, selectedDirektorat);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setErrorMessage(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const handleDirektoratFilterChange = (dir: string) => {
    setSelectedDirektorat(dir);
    if (searchQuery.trim()) {
      performSearch(searchQuery, dir);
    }
  };

  const getStatusBadge = (status: StatusPermohonan) => {
    switch (status) {
      case 'Disetujui':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui / Terbit
          </span>
        );
      case 'Ditolak':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-3.5 h-3.5" /> Ditolak
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Kunjungan Selesai
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Sedang Diproses
          </span>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Search Header Banner */}
      <div className="bg-[#0a2e1e] text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-400 border border-amber-500/30 rounded-lg bg-amber-500/10">
              Layanan Pelacakan Status Real-Time
            </span>
            {fixedDirektorat ? (
              <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-400/30 rounded-lg bg-emerald-500/20">
                Direktorat {fixedDirektorat}
              </span>
            ) : (
              <>
                <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-400/30 rounded-lg bg-emerald-500/20">
                  Penuntutan
                </span>
                <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-purple-300 border border-purple-400/30 rounded-lg bg-purple-500/20">
                  Penindakan
                </span>
              </>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Lacak Surat Izin Kunjungan (T-10)
          </h2>
          <p className="text-slate-300 text-sm max-w-xl">
            Lacak status permohonan izin kunjungan tahanan secara instan dengan memasukkan <strong>Nama Pengunjung</strong>, <strong>NIK</strong>, <strong>Nomor Surat Registrasi T-10</strong>, atau <strong>Nama Tahanan</strong>.
          </p>
        </div>
      </div>

      {/* Search Bar Form */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 mb-8 space-y-5">
        {/* Directorate Filter Tabs (If not locked by fixedDirektorat prop) */}
        {!fixedDirektorat && (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Filter Direktorat:
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'Semua', label: 'Semua Direktorat' },
                { id: 'Penuntutan', label: 'Direktorat Penuntutan' },
                { id: 'Penindakan', label: 'Direktorat Penindakan' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleDirektoratFilterChange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedDirektorat === tab.id
                    ? 'bg-[#0a2e1e] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nama Pengunjung, NIK, atau Nomor Surat Registrasi
            </label>
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Ketik nama pengunjung, NIK, atau nomor surat (contoh: Dwi, Susmalita, 3302...)"
                required
                className="w-full pl-12 pr-36 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition placeholder:text-slate-400 placeholder:font-normal"
              />

              <div className="absolute right-2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Hapus pencarian"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="px-4 py-2 bg-[#0a2e1e] hover:bg-[#0d3d28] text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mencari...</span>
                    </>
                  ) : (
                    <span>Lacak Data</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            💡 <strong>Pencarian Cepat:</strong> Data langsung dicari otomatis saat Anda mengetik nama pengunjung, NIK, atau nomor surat registrasi.
          </p>
        </form>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm mb-6">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && !isLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Ditemukan <strong>{searchResults.length}</strong> permohonan untuk kata kunci <strong>"{searchQuery}"</strong>
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Data Tidak Ditemukan
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Tidak ada permohonan yang cocok dengan kata kunci <strong>"{searchQuery}"</strong>. Pastikan Nama Pengunjung, NIK, atau Nomor Surat yang Anda masukkan sudah sesuai.
              </p>
            </div>
          ) : (
            searchResults.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-7 space-y-5 transition-all hover:shadow-lg"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${item.direktorat === 'Penindakan'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                        Direktorat {item.direktorat || 'Penuntutan'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Nomor Registrasi Surat T-10
                    </p>
                    <p className="text-lg font-bold font-mono text-[#0a2e1e] mt-0.5">
                      Nomor: {item.nomorSurat}
                    </p>
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div className="space-y-2 bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      Identitas Pengunjung (Pemohon):
                    </p>
                    <p><span className="text-slate-500">Nama Pengunjung:</span> <strong className="text-slate-900 text-sm">{item.namaPemohon}</strong></p>
                    <p><span className="text-slate-500">NIK:</span> <span className="font-mono">{item.nikPemohon}</span></p>
                    <p><span className="text-slate-500">Hubungan:</span> {item.hubungan}</p>
                    {item.alamatPemohon && (
                      <p><span className="text-slate-500">Alamat:</span> {item.alamatPemohon}</p>
                    )}
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      Tahanan:
                    </p>
                    <p><span className="text-slate-500">Nama:</span> <strong className="text-slate-900 text-sm">{item.namaTahanan}</strong></p>
                    <p><span className="text-slate-500">Pangkat/Satuan:</span> {item.pangkatNrpTahanan} ({item.satuanTahanan})</p>
                    <p><span className="text-slate-500">Lokasi Rutan:</span> {item.lokasiRutan}</p>
                  </div>
                </div>

                {item.catatanPetugas && item.catatanPetugas !== '-' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                    <span className="font-bold">Catatan Petugas: </span>
                    <span>{item.catatanPetugas}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-600">
                    <span>Jadwal Kunjungan: </span>
                    <strong className="text-slate-900">{formatIndonesianDate(item.tanggalKunjungan)} ({item.sesiKunjungan})</strong>
                  </div>

                  {/* Button to view official T-10 document if approved / completed */}
                  {onViewDoc && (item.status === 'Disetujui' || item.status === 'Selesai') && (
                    <button
                      type="button"
                      onClick={() => onViewDoc(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0a2e1e] hover:bg-[#0d3d28] text-amber-400 hover:text-amber-300 rounded-lg text-xs font-bold transition shadow-sm active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Lihat Surat Izin T-10
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
