import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Edit, Trash2, Search, Save, X, Eye, Lock,
  ChevronDown, ChevronUp, AlertCircle, Building2
} from 'lucide-react';
import { Tahanan, Direktorat } from '../types';

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

  const currentUserStr = localStorage.getItem('userAccount');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserRole: string = currentUser?.role || '';
  const isPUK = currentUserRole === 'Penuntut Umum Koneksitas' || currentUserRole === 'Penyidik Koneksitas';

  useEffect(() => { 
    if (currentUser?.direktorat) {
      setActiveTabDir(currentUser.direktorat);
    }
    fetchList(); 
  }, []);

  if (isPUK) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-2">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Akses Terbatas</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Halaman <strong>Data Tahanan</strong> tidak tersedia untuk role <strong>{currentUserRole}</strong>.<br />
          Silakan gunakan <strong>Dashboard</strong> untuk mengelola persetujuan kunjungan.
        </p>
      </div>
    );
  }

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/tahanan');
      const json = await resp.json();
      if (json.status === 'success') setList(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (item?: Tahanan) => {
    setFormError('');
    if (item) {
      setFormData({ ...item });
      setIsEditing(true);
    } else {
      const defaultDir = activeTabDir === 'Semua' ? (currentUser?.direktorat || 'Penuntutan') : activeTabDir;
      setFormData({ ...EMPTY_FORM, direktorat: defaultDir });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.namaLengkap || !formData.nik || !formData.tempatDitahan) {
      setFormError('Nama Lengkap, NIK, dan Tempat Ditahan wajib diisi.');
      return;
    }
    const payload = {
      ...formData,
      namaTahanan: formData.namaTahanan || formData.namaLengkap,
      lokasiRutan: formData.lokasiRutan || formData.tempatDitahan,
    };
    setIsSubmitting(true);
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/tahanan/${formData.id}` : '/api/tahanan';
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        await fetchList();
        setIsModalOpen(false);
      }
    } catch (err) {
      setFormError('Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data tahanan ini? Tindakan tidak bisa dibatalkan.')) return;
    try {
      await fetch(`/api/tahanan/${id}`, { method: 'DELETE' });
      await fetchList();
    } catch (err) { console.error(err); }
  };

  const filtered = list.filter(t => {
    const matchDir = activeTabDir === 'Semua' || (t.direktorat || 'Penuntutan') === activeTabDir;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">JAMPIDMIL · Kejaksaan RI</p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">Data Tahanan</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Kelola daftar tahanan militer untuk Direktorat Penuntutan dan Penindakan.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, NIK, lokasi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-60 pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] shadow-sm"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#0a2e1e] hover:bg-[#0d3d28] text-amber-400 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Tahanan
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
            {tab === 'Semua' ? 'Semua Tahanan' : `Tahanan ${tab}`}
            <span className="ml-2 text-xs py-0.5 px-2 rounded-full bg-slate-100 text-slate-600">
              {tab === 'Semua' ? list.length : list.filter(t => (t.direktorat || 'Penuntutan') === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium">Total Tahanan Terfilter</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-xs text-emerald-700 font-semibold">Laki-laki</p>
          <p className="text-3xl font-bold text-emerald-900 mt-1">{filtered.filter(t => t.jenisKelamin === 'Laki-laki').length}</p>
        </div>
        <div className="bg-pink-50 p-4 rounded-xl border border-pink-200 shadow-sm">
          <p className="text-xs text-pink-700 font-semibold">Perempuan</p>
          <p className="text-3xl font-bold text-pink-900 mt-1">{filtered.filter(t => t.jenisKelamin === 'Perempuan').length}</p>
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
                        <button onClick={() => handleOpenModal(t)} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
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

            <form onSubmit={handleSave} className="p-6 space-y-5">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Direktorat <span className="text-red-500">*</span></label>
                  <select
                    value={formData.direktorat || 'Penuntutan'}
                    onChange={e => setFormData({ ...formData, direktorat: e.target.value as Direktorat })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  >
                    <option value="Penuntutan">Direktorat Penuntutan</option>
                    <option value="Penindakan">Direktorat Penindakan</option>
                  </select>
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
    </div>
  );
};
