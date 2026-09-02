import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Edit, Trash2, Search, Save, X, Eye, Lock,
  ChevronDown, ChevronUp, AlertCircle, Building2
} from 'lucide-react';
import { Tahanan, Direktorat } from '../types';
import { LoadingScreen } from './LoadingScreen';

const AGAMA_OPTIONS = ['Islam', 'Kristen Protestan', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
const PENDIDIKAN_OPTIONS = ['SD', 'SMP/Sederajat', 'SMA/Sederajat', 'D1/D2/D3', 'S1/D4', 'S2', 'S3'];
const RUTAN_OPTIONS = [
  'RTM Guntur Pomdam Jaya',
  'RTM Cimahi',
  'Rutan Salemba Cab. Kejaksaan Agung',
  'RTM Wirogunan',
  'RTM Makassar',
  'Lainnya',
];

const EMPTY_FORM: Partial<Tahanan> = {
  namaLengkap: '',
  direktorat: 'Penuntutan',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: 'Laki-laki',
  kebangsaan: 'Indonesia',
  tempatTinggal: '',
  agama: 'Islam',
  pekerjaan: '',
  pendidikan: 'SMA/Sederajat',
  nik: '',
  tempatDitahan: '',
  namaTahanan: '',
  pangkatNrpTahanan: '',
  satuanTahanan: '',
  lokasiRutan: '',
};

export const AdminTahananPage: React.FC = () => {
  const [list, setList] = useState<Tahanan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabDir, setActiveTabDir] = useState<Direktorat | 'Semua'>('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Tahanan>>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [viewDetail, setViewDetail] = useState<Tahanan | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tahanan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUserStr = localStorage.getItem('userAccount');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserRole: string = currentUser?.role || '';
  const userDir: Direktorat = currentUser?.direktorat || 'Penuntutan';
  const isAdmin = currentUserRole === 'Admin';
  const isReadOnly = currentUserRole === 'Penuntut Umum Koneksitas' || currentUserRole === 'Penyidik Koneksitas';

  useEffect(() => { 
    fetchList(); 
  }, [userDir]);

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`/api/tahanan?direktorat=${userDir}`, {
        headers: {
          'x-user-role': currentUserRole,
          'x-user-direktorat': userDir,
          'x-user-nip': currentUser?.nip || '',
        }
      });
      const data = await resp.json();
      if (data.status === 'success') {
        setList(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (item?: Tahanan) => {
    if (item) {
      setIsEditing(true);
      setFormData({ ...item });
    } else {
      setIsEditing(false);
      setFormData({ ...EMPTY_FORM, direktorat: userDir });
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.namaLengkap || !formData.tempatDitahan) {
      setFormError('Nama lengkap dan Tempat Ditahan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/tahanan/${formData.id}` : '/api/tahanan';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        namaTahanan: formData.namaLengkap,
        direktorat: userDir, // STRICT: Bound to current directorate
        lokasiRutan: formData.tempatDitahan,
      };

      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUserRole,
          'x-user-direktorat': userDir,
          'x-user-nip': currentUser?.nip || '',
        },
        body: JSON.stringify(payload),
      });

      const resJson = await resp.json();
      if (resJson.status === 'success') {
        setIsModalOpen(false);
        await fetchList();
      } else {
        const errJson = resJson;
        setFormError(errJson.message || 'Gagal menyimpan data.');
      }
    } catch (err) {
      setFormError('Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isReadOnly) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/tahanan/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUserRole,
          'x-user-direktorat': userDir,
          'x-user-nip': currentUser?.nip || '',
        }
      });
      setDeleteTarget(null);
      await fetchList();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = list.filter(t => {
    const matchDir = (t.direktorat || 'Penuntutan') === userDir;
    const matchSearch =
      (t.namaLengkap || t.namaTahanan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.nik || '').includes(searchQuery) ||
      (t.tempatDitahan || t.lokasiRutan || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchDir && matchSearch;
  });

  const Field = ({ label, value }: { label: string; value?: string }) => (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-0.5">{value || '-'}</p>
    </div>
  );

  if (isLoading) {
    return <LoadingScreen message={`Memuat Data Tahanan Militer (Direktorat ${userDir})...`} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JAMPIDMIL · Kejaksaan RI</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Data Tahanan</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar data tahanan militer khusus Direktorat {userDir}.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, NIK, lokasi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-60 pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] shadow-sm"
            />
          </div>
          {!isReadOnly && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 bg-[#0a2e1e] hover:bg-[#0d3d28] text-amber-400 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              Tambah Tahanan
            </button>
          )}
        </div>
      </div>

      {/* Dedicated Directorate Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white px-5 py-3.5 rounded-2xl border border-emerald-800 shadow-md flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Master Data Tahanan</p>
            <h3 className="text-sm font-bold text-white">Direktorat {userDir} · JAMPIDMIL</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          {isReadOnly ? (
            <span className="bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/30 font-semibold">
              Mode Lihat Saja (Read-Only)
            </span>
          ) : (
            <span className="bg-white/10 px-3 py-1 rounded-full border border-white/10">
              Hak Kelola Data Aktif
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Tahanan Terfilter</p>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-xs text-emerald-700 font-semibold">Laki-laki</p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-900 mt-1">{filtered.filter(t => t.jenisKelamin === 'Laki-laki').length}</p>
        </div>
        <div className="bg-pink-50/80 p-4 rounded-xl border border-pink-200 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-pink-700 font-semibold">Perempuan</p>
          <p className="text-2xl sm:text-3xl font-bold text-pink-900 mt-1">{filtered.filter(t => t.jenisKelamin === 'Perempuan').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0a2e1e] text-slate-300 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Direktorat</th>
                <th className="px-5 py-4">Nama Lengkap / NIK</th>
                <th className="px-5 py-4">Pangkat & Satuan</th>
                <th className="px-5 py-4">Tempat Ditahan</th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">Memuat data...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400">Tidak ada data tahanan.</td></tr>
              ) : (
                filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {t.direktorat || 'Penuntutan'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{t.namaLengkap || t.namaTahanan}</p>
                      <p className="font-mono text-xs text-slate-500 mt-0.5">NIK: {t.nik || '-'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 text-sm">
                      <p className="font-semibold text-slate-800">{t.pangkatNrpTahanan || '-'}</p>
                      <p className="text-slate-500 text-xs">{t.satuanTahanan || '-'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                        {t.tempatDitahan || t.lokasiRutan || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setViewDetail(t)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Lihat Detail">
                          <Eye className="w-4 h-4" />
                        </button>
                        {!isReadOnly && (
                          <button onClick={() => handleOpenModal(t)} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {!isReadOnly && (
                          <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                            <Trash2 className="w-4 h-4" />
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

      {/* Detail Modal */}
      {viewDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-emerald-950 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  Biodata Tahanan · Direktorat {viewDetail.direktorat || 'Penuntutan'}
                </p>
                <h3 className="font-bold text-white">{viewDetail.namaLengkap || viewDetail.namaTahanan}</h3>
              </div>
              <button onClick={() => setViewDetail(null)} className="text-slate-300 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <Field label="Direktorat" value={viewDetail.direktorat || 'Penuntutan'} />
              <Field label="NIK" value={viewDetail.nik} />
              <Field label="Nama Lengkap" value={viewDetail.namaLengkap || viewDetail.namaTahanan} />
              <Field label="Jenis Kelamin" value={viewDetail.jenisKelamin} />
              <Field label="Tempat Lahir" value={viewDetail.tempatLahir} />
              <Field label="Tanggal Lahir" value={viewDetail.tanggalLahir} />
              <Field label="Kebangsaan" value={viewDetail.kebangsaan} />
              <Field label="Agama" value={viewDetail.agama} />
              <Field label="Pendidikan" value={viewDetail.pendidikan} />
              <Field label="Pekerjaan" value={viewDetail.pekerjaan} />
              <Field label="Pangkat / NRP" value={viewDetail.pangkatNrpTahanan} />
              <Field label="Satuan Asal" value={viewDetail.satuanTahanan} />
              <div className="sm:col-span-2">
                <Field label="Tempat Tinggal" value={viewDetail.tempatTinggal} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Tempat Ditahan / Rutan" value={viewDetail.tempatDitahan || viewDetail.lokasiRutan} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-emerald-950 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  {isEditing ? 'Edit Data' : 'Tambah Baru'}
                </p>
                <h3 className="font-bold text-white text-lg">Data Tahanan Militer</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                Direktorat & Identitas Diri
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Direktorat Penahanan
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`Direktorat ${userDir}`}
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Data tahanan baru secara otomatis terafiliasi dengan Direktorat {userDir}.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.namaLengkap || ''} onChange={e => setFormData({...formData, namaLengkap: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">NIK <span className="text-red-500">*</span></label>
                  <input required type="text" maxLength={16} value={formData.nik || ''} onChange={e => setFormData({...formData, nik: e.target.value.replace(/\D/g,'')})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="16 digit NIK" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jenis Kelamin</label>
                  <select value={formData.jenisKelamin || 'Laki-laki'} onChange={e => setFormData({...formData, jenisKelamin: e.target.value as any})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none">
                    <option>Laki-laki</option>
                    <option>Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tempat Lahir</label>
                  <input type="text" value={formData.tempatLahir || ''} onChange={e => setFormData({...formData, tempatLahir: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tanggal Lahir</label>
                  <input type="date" value={formData.tanggalLahir || ''} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kebangsaan</label>
                  <input type="text" value={formData.kebangsaan || 'Indonesia'} onChange={e => setFormData({...formData, kebangsaan: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Agama</label>
                  <select value={formData.agama || 'Islam'} onChange={e => setFormData({...formData, agama: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none">
                    {AGAMA_OPTIONS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pekerjaan</label>
                  <input type="text" value={formData.pekerjaan || ''} onChange={e => setFormData({...formData, pekerjaan: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="misal: Prajurit TNI AD" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pendidikan Terakhir</label>
                  <select value={formData.pendidikan || 'SMA/Sederajat'} onChange={e => setFormData({...formData, pendidikan: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none">
                    {PENDIDIKAN_OPTIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tempat Tinggal / Alamat</label>
                  <textarea rows={2} value={formData.tempatTinggal || ''} onChange={e => setFormData({...formData, tempatTinggal: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>
              </div>

              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider border-b border-slate-200 pb-2 pt-2">
                Data Militer & Penahanan
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pangkat / NRP</label>
                  <input type="text" value={formData.pangkatNrpTahanan || ''} onChange={e => setFormData({...formData, pangkatNrpTahanan: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="misal: Sertu / 2109883018" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Satuan Asal</label>
                  <input type="text" value={formData.satuanTahanan || ''} onChange={e => setFormData({...formData, satuanTahanan: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="misal: Yonif Raider 200" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tempat Ditahan (Rutan) <span className="text-red-500">*</span></label>
                  <select required value={formData.tempatDitahan || ''} onChange={e => setFormData({...formData, tempatDitahan: e.target.value, lokasiRutan: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none">
                    <option value="">-- Pilih Rutan --</option>
                    {RUTAN_OPTIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-amber-300 rounded-xl text-sm font-bold shadow-md transition disabled:opacity-60">
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Tahanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-base">Hapus Data Tahanan?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Apakah Anda yakin ingin menghapus data tahanan <strong className="text-slate-900">{deleteTarget.namaLengkap || deleteTarget.namaTahanan}</strong> (NIK: {deleteTarget.nik || '-'})?
                </p>
                <p className="text-[11px] text-red-600 font-medium mt-1">
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
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Tahanan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
