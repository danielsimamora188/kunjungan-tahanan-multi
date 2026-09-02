import React, { useState, useEffect, useRef } from 'react';
import {
  UserCog, Plus, Edit, Trash2, Search, Save, X,
  CheckCircle2, Shield, PenLine, Upload, AlertCircle, Eye, EyeOff, Lock, Building2
} from 'lucide-react';
import { AkunUser, RoleAkun, Direktorat } from '../types';
import { compressBase64Image } from '../utils/validation';

const ROLES: RoleAkun[] = ['Admin', 'Staff', 'Penuntut Umum Koneksitas', 'Penyidik Koneksitas'];

const ROLE_COLORS: Record<RoleAkun, string> = {
  'Admin': 'bg-red-100 text-red-800 border-red-200',
  'Staff': 'bg-blue-100 text-blue-800 border-blue-200',
  'Penuntut Umum Koneksitas': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Penyidik Koneksitas': 'bg-purple-100 text-purple-800 border-purple-200',
};

const EMPTY_FORM: Partial<AkunUser> = {
  nama: '',
  nip: '',
  tipeIdentitas: 'NIP',
  pangkat: '',
  jabatan: '',
  role: 'Staff',
  direktorat: 'Penuntutan',
  email: '',
  noHp: '',
  username: '',
  password: '',
  eSignEnabled: false,
  fotoTandaTangan: '',
};

export const AdminAkunPage: React.FC = () => {
  const [list, setList] = useState<AkunUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabDir, setActiveTabDir] = useState<Direktorat | 'Semua'>('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<AkunUser>>({ ...EMPTY_FORM });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const signatureRef = useRef<HTMLInputElement>(null);

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/akun');
      const json = await resp.json();
      if (json.status === 'success') setList(json.data);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const currentUserStr = localStorage.getItem('userAccount');
  const currentUser: AkunUser | null = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => { 
    if (currentUser?.direktorat) {
      setActiveTabDir(currentUser.direktorat);
    }
    fetchList(); 
  }, []);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-2">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Akses Ditolak</h2>
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Halaman <strong>Akun & E-Sign</strong> hanya dapat diakses oleh <strong>Administrator</strong>.<br />
          Role Anda saat ini: <span className="font-bold text-red-600">{currentUser?.role || 'Tidak Dikenali'}</span>
        </p>
      </div>
    );
  }

  const handleOpenModal = (account?: AkunUser) => {
    if (account) {
      setIsEditing(true);
      setFormData({ ...account });
    } else {
      setIsEditing(false);
      const defaultDir = activeTabDir === 'Semua' ? (currentUser?.direktorat || 'Penuntutan') : activeTabDir;
      setFormData({ 
        ...EMPTY_FORM, 
        direktorat: defaultDir,
        role: defaultDir === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas'
      });
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const compressed = await compressBase64Image(raw, 500, 500, 0.6);
      setFormData(prev => ({ ...prev, fotoTandaTangan: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const isEdit = !!formData.id;
      const url = isEdit ? `/api/akun/${formData.id}` : '/api/akun';
      const method = isEdit ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await resp.json();
      if (resp.ok && json.status === 'success') {
        await fetchList();
        setIsModalOpen(false);
      } else {
        setFormError(json.message || 'Gagal menyimpan akun.');
      }
    } catch {
      setFormError('Terjadi kesalahan saat menyimpan akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus akun ini?')) return;
    try {
      const resp = await fetch(`/api/akun/${id}`, { method: 'DELETE' });
      const json = await resp.json();
      if (resp.ok && json.status === 'success') {
        setList(prev => prev.filter(a => a.id !== id));
      } else {
        alert(json.message || 'Gagal menghapus akun.');
      }
    } catch {
      alert('Terjadi kesalahan koneksi.');
    }
  };

  const filtered = list.filter(a => {
    const matchDir = activeTabDir === 'Semua' || (a.direktorat || 'Penuntutan') === activeTabDir;
    const matchSearch = 
      a.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.nip.includes(searchQuery) ||
      (a.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.jabatan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDir && matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <UserCog className="w-7 h-7 text-[#0a2e1e]" />
            Kelola Akun & E-Sign
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manajemen akun pengguna Admin, Staff, Penuntut Umum Koneksitas, dan Penyidik Koneksitas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, NIP, username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a2e1e] w-56"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-[#0a2e1e] hover:bg-[#0d3d28] text-amber-400 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Akun
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
              {tab === 'Semua' ? list.length : list.filter(a => (a.direktorat || 'Penuntutan') === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ROLES.map(role => (
          <div key={role} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">{role}</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              {list.filter(a => {
                const matchDir = activeTabDir === 'Semua' || (a.direktorat || 'Penuntutan') === activeTabDir;
                return matchDir && a.role === role;
              }).length}
            </p>
          </div>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading ? (
          <p className="text-slate-400 col-span-3 text-center py-10">Memuat data...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400 col-span-3 text-center py-10">Tidak ada akun yang ditemukan.</p>
        ) : (
          filtered.map(a => (
            <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold text-base">
                    {a.nama.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {a.direktorat || 'Penuntutan'}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm leading-tight mt-0.5">{a.nama}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.tipeIdentitas || 'NIP'}: {a.nip}</p>
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${ROLE_COLORS[a.role] || 'bg-slate-100 text-slate-700'}`}>
                  {a.role}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl">
                <p><span className="font-semibold text-slate-700">Username:</span> {a.username || '-'}</p>
                <p><span className="font-semibold text-slate-700">Pangkat:</span> {a.pangkat || '-'}</p>
                <p><span className="font-semibold text-slate-700">Jabatan:</span> {a.jabatan}</p>
                <p><span className="font-semibold text-slate-700">Email:</span> {a.email || '-'}</p>
                <p><span className="font-semibold text-slate-700">No. WhatsApp:</span> {a.noHp || '-'}</p>
              </div>

              {/* E-Sign Status */}
              <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                a.eSignEnabled
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200'
              }`}>
                {a.eSignEnabled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    E-Sign Aktif
                    {a.fotoTandaTangan && (
                      <img src={a.fotoTandaTangan} alt="ttd" className="ml-auto h-8 w-20 object-contain border border-emerald-200 rounded" />
                    )}
                  </>
                ) : (
                  <>
                    <PenLine className="w-3.5 h-3.5 text-slate-400" />
                    E-Sign Belum Diaktifkan
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button onClick={() => handleOpenModal(a)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(a.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-emerald-950 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                  {isEditing ? 'Edit Akun' : 'Tambah Akun Baru'}
                </p>
                <h3 className="font-bold text-white">Data Pengguna Sistem JAMPIDMIL</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Direktorat <span className="text-red-500">*</span></label>
                  <select
                    value={formData.direktorat || 'Penuntutan'}
                    onChange={e => {
                      const newDir = e.target.value as Direktorat;
                      setFormData({
                        ...formData,
                        direktorat: newDir,
                        role: newDir === 'Penindakan' ? 'Penyidik Koneksitas' : 'Penuntut Umum Koneksitas'
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  >
                    <option value="Penuntutan">Direktorat Penuntutan</option>
                    <option value="Penindakan">Direktorat Penindakan</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap & Gelar <span className="text-red-500">*</span></label>
                  <input required type="text" value={formData.nama || ''} onChange={e => setFormData({...formData, nama: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipe Identitas <span className="text-red-500">*</span></label>
                  <select
                    value={formData.tipeIdentitas || 'NIP'}
                    onChange={e => setFormData({...formData, tipeIdentitas: e.target.value as 'NIP' | 'NRP'})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none">
                    <option value="NIP">NIP (Nomor Induk Pegawai)</option>
                    <option value="NRP">NRP (Nomor Registrasi Pokok)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nomor {formData.tipeIdentitas || 'NIP'} <span className="text-red-500">*</span>
                  </label>
                  <input required type="text" value={formData.nip || ''} onChange={e => setFormData({...formData, nip: e.target.value})}
                    placeholder={`Masukkan nomor ${formData.tipeIdentitas || 'NIP'}...`}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pangkat / Golongan</label>
                  <input type="text" value={formData.pangkat || ''} onChange={e => setFormData({...formData, pangkat: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="misal: Jaksa Madya (IV/a)" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role / Peran</label>
                  <select value={formData.role || 'Staff'} onChange={e => setFormData({...formData, role: e.target.value as RoleAkun})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jabatan Dinas</label>
                  <input type="text" value={formData.jabatan || ''} onChange={e => setFormData({...formData, jabatan: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder={formData.direktorat === 'Penindakan' ? "misal: Penyidik Koneksitas" : "misal: Penuntut Umum Koneksitas"} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. HP / WhatsApp</label>
                  <input type="text" value={formData.noHp || ''} onChange={e => setFormData({...formData, noHp: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="0812xxxx" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Dinas</label>
                  <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username Login</label>
                  <input type="text" value={formData.username || ''} onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="misal: penyidik_bambang" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password Login</label>
                  <input type="password" value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-700 focus:outline-none" placeholder="••••••••" />
                </div>
              </div>

              {/* E-Sign Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-emerald-700" />
                    <span className="text-sm font-bold text-slate-800">E-Sign / Tanda Tangan Digital</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.eSignEnabled || false}
                      onChange={e => setFormData({...formData, eSignEnabled: e.target.checked})} className="sr-only peer" />
                    <div className="w-10 h-6 bg-slate-300 peer-checked:bg-emerald-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
                  </label>
                </div>

                {formData.eSignEnabled && (
                  <div>
                    <p className="text-xs text-slate-600 mb-2">Upload gambar tanda tangan (PNG transparan direkomendasikan):</p>
                    <div
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center cursor-pointer transition"
                      onClick={() => signatureRef.current?.click()}
                    >
                      {formData.fotoTandaTangan ? (
                        <img src={formData.fotoTandaTangan} alt="Tanda Tangan" className="h-16 object-contain" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <p className="text-xs text-slate-500">Klik untuk upload gambar tanda tangan</p>
                        </>
                      )}
                    </div>
                    <input ref={signatureRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-amber-300 rounded-xl text-sm font-bold shadow-md transition disabled:opacity-60">
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
