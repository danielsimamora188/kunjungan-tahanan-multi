import React, { useState, useEffect } from 'react';
import { Search, Shield, Clock, CheckCircle2, XCircle, AlertCircle, User, Calendar, MapPin, ExternalLink, ArrowRight, Building2 } from 'lucide-react';
import { PermohonanT10, StatusPermohonan, Direktorat } from '../types';
import { formatIndonesianDate } from '../utils/validation';

interface TrackingViewProps {
  initialQuery?: string;
  direktorat?: Direktorat;
  onViewDoc?: (permohonan: PermohonanT10) => void;
}

export const TrackingView: React.FC<TrackingViewProps> = ({ 
  initialQuery = '', 
  direktorat,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PermohonanT10[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (queryToSearch: string) => {
    const clean = queryToSearch.trim();
    if (!clean) return;

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      // When no direktorat is specified, search across ALL directorates
      const url = direktorat
        ? `/api/permohonan?q=${encodeURIComponent(clean)}&direktorat=${direktorat}`
        : `/api/permohonan?q=${encodeURIComponent(clean)}`;
      
      const response = await fetch(url);
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
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
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
              Layanan Pelacakan Status
            </span>
            {direktorat ? (
              <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-300 border border-emerald-400/30 rounded-lg bg-emerald-500/20">
                Direktorat {direktorat}
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
            {direktorat
              ? `Masukkan Nomor Registrasi Surat T-10 atau NIK Pemohon (Direktorat ${direktorat}).`
              : 'Cari permohonan dari Direktorat Penuntutan maupun Penindakan sekaligus. Masukkan Nomor Registrasi atau NIK Pemohon.'}
          </p>
        </div>
      </div>

      {/* Search Bar Form */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 mb-8">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Nomor Surat Registrasi atau NIK Pemohon
            </label>
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  direktorat === 'Penindakan'
                    ? 'Contoh: B-1/PM.3/PMpd.1/09/2026 atau NIK...'
                    : direktorat === 'Penuntutan'
                    ? 'Contoh: B-1/PM.3/PMpt.1/09/2026 atau NIK...'
                    : 'Nomor Surat (PMpt.1/PMpd.1) atau NIK Pemohon...'
                }
                required
                className="w-full pl-12 pr-28 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] transition font-mono"
              />
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className="absolute right-2 px-5 py-2.5 bg-[#0a2e1e] hover:bg-[#0d3d28] text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Mencari...' : 'Lacak Data'}
              </button>
            </div>
          </div>
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
          {searchResults.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Data Tidak Ditemukan
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tidak ada permohonan yang cocok dengan kata kunci <strong>"{searchQuery}"</strong>. Pastikan Nomor Surat atau NIK yang Anda masukkan sudah benar.
              </p>
            </div>
          ) : (
            searchResults.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-7 space-y-5 animate-in fade-in duration-200"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
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
                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      Identitas Pengunjung:
                    </p>
                    <p><span className="text-slate-500">Nama:</span> <strong>{item.namaPemohon}</strong></p>
                    <p><span className="text-slate-500">NIK:</span> {item.nikPemohon}</p>
                    <p><span className="text-slate-500">Hubungan:</span> {item.hubungan}</p>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      Tahanan Militer:
                    </p>
                    <p><span className="text-slate-500">Nama:</span> <strong>{item.namaTahanan}</strong></p>
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-500">
                    <span>Jadwal Kunjungan: </span>
                    <strong className="text-slate-900">{formatIndonesianDate(item.tanggalKunjungan)} ({item.sesiKunjungan})</strong>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
