import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Scale,
  Users,
  UserCog,
  Menu,
  X,
  ClipboardList,
  Edit3,
  Save,
  Upload,
  PenLine,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AkunUser } from '../types';
import { compressBase64Image, normalizePhoneNumber } from '../utils/validation';

const ALL_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, roles: ['Admin', 'Staff', 'Penuntut Umum Koneksitas', 'Penyidik Koneksitas'] },
  { to: '/admin/kunjungan', label: 'Data Kunjungan', icon: ClipboardList, exact: false, roles: ['Admin', 'Staff'] },
  { to: '/admin/tahanan', label: 'Data Tahanan', icon: Users, exact: false, roles: ['Admin', 'Staff', 'Penuntut Umum Koneksitas', 'Penyidik Koneksitas'] },
  { to: '/admin/akun', label: 'Akun & E-Sign', icon: UserCog, exact: false, roles: ['Admin'] },
];

const ROLE_BADGE: Record<string, string> = {
  'Admin': 'bg-red-100 text-red-700',
  'Staff': 'bg-blue-100 text-blue-700',
  'Penuntut Umum Koneksitas': 'bg-amber-100 text-amber-700',
  'Penyidik Koneksitas': 'bg-purple-100 text-purple-700',
};

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AkunUser | null>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<AkunUser>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/login');
    } else {
      setIsAuthenticated(true);
      const userStr = localStorage.getItem('userAccount');
      if (userStr) {
        try { setCurrentUser(JSON.parse(userStr)); } catch {}
      }
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userAccount');
    navigate('/login');
  };

  const handleOpenProfileModal = () => {
    if (currentUser) {
      setProfileForm({ ...currentUser, noHp: normalizePhoneNumber(currentUser.noHp) });
    } else {
      setProfileForm({ nama: '', nip: '', pangkat: '', jabatan: '', role: 'Admin', email: '', noHp: '', username: '', password: '', eSignEnabled: false });
    }
    setProfileSuccess(false);
    setProfileError('');
    setShowProfileModal(true);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const raw = ev.target?.result as string;
      const compressed = await compressBase64Image(raw, 500, 500, 0.6);
      setProfileForm(prev => ({ ...prev, fotoTandaTangan: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccess(false);
    setProfileError('');
    try {
      const isEdit = !!profileForm.id;
      const url = isEdit ? `/api/akun/${profileForm.id}` : '/api/akun';
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        ...profileForm,
        noHp: normalizePhoneNumber(profileForm.noHp),
        direktorat: currentUser?.direktorat || profileForm.direktorat || 'Penuntutan',
      };
      const resp = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'Staff',
          'x-user-direktorat': currentUser?.direktorat || 'Penuntutan',
          'x-user-nip': currentUser?.nip || '',
        },
        body: JSON.stringify(payload)
      });
      const json = await resp.json();
      if (resp.ok && json.status === 'success') {
        const updated = json.data;
        localStorage.setItem('userAccount', JSON.stringify(updated));
        setCurrentUser(updated);
        setProfileSuccess(true);
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccess(false);
        }, 1500);
      } else {
        setProfileError(json.message || 'Gagal menyimpan profil.');
      }
    } catch {
      setProfileError('Terjadi kesalahan saat menyimpan profil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (!isAuthenticated) return null;

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const filteredNav = ALL_NAV_ITEMS.filter(item => item.roles.includes(currentUser?.role || 'Admin'));

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-[#0a2e1e] flex flex-col shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0 lg:z-auto`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/logo-pidmil.png"
              alt="Logo PIDMIL"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <p className="text-xs font-bold text-white leading-tight">JAMPIDMIL</p>
              <p className="text-[10px] text-slate-400 leading-tight">Panel Admin T-10</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-bold text-xs shrink-0">
              {currentUser?.nama?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser?.nama || 'Administrator'}</p>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ROLE_BADGE[currentUser?.role || 'Admin'] || 'bg-slate-100 text-slate-700'}`}>
                  {currentUser?.role || 'Admin'}
                </span>
                <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-700/60">
                  Dit. {currentUser?.direktorat || 'Penuntutan'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-amber-400 text-[#0a2e1e] font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <button
            onClick={handleOpenProfileModal}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <User className="w-4 h-4 shrink-0" />
            Edit Profil
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:hidden sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-pidmil.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="text-xs font-bold text-slate-800">JAMPIDMIL T-10</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[92vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="sticky top-0 bg-emerald-950 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Akun Saya</p>
                <h3 className="font-bold text-white">Edit Profil Pengguna</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {/* Success / Error Banner */}
              {profileSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Profil berhasil diperbarui!
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {profileError}
                </div>
              )}

              {/* Direktorat (read-only) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Direktorat <span className="text-slate-400 font-normal">(tidak dapat diubah)</span></label>
                <input
                  type="text"
                  disabled
                  value={`Direktorat ${currentUser?.direktorat || 'Penuntutan'}`}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Nama */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap & Gelar <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={profileForm.nama || ''}
                  onChange={e => setProfileForm({ ...profileForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Tipe Identitas + NIP/NRP */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipe ID</label>
                  <select
                    value={profileForm.tipeIdentitas || 'NIP'}
                    onChange={e => setProfileForm({ ...profileForm, tipeIdentitas: e.target.value as 'NIP' | 'NRP' })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="NIP">NIP</option>
                    <option value="NRP">NRP</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{profileForm.tipeIdentitas || 'NIP'}</label>
                  <input
                    type="text"
                    value={profileForm.nip || ''}
                    onChange={e => setProfileForm({ ...profileForm, nip: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="Masukkan NIP/NRP"
                  />
                </div>
              </div>

              {/* Pangkat + Jabatan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pangkat / Golongan</label>
                  <input
                    type="text"
                    value={profileForm.pangkat || ''}
                    onChange={e => setProfileForm({ ...profileForm, pangkat: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="misal: Letkol"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jabatan Dinas</label>
                  <input
                    type="text"
                    value={profileForm.jabatan || ''}
                    onChange={e => setProfileForm({ ...profileForm, jabatan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="misal: Penuntut Umum"
                  />
                </div>
              </div>

              {/* Email + No HP */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Dinas</label>
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="nama@kejaksaan.go.id"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={profileForm.noHp || ''}
                    onChange={e => setProfileForm({ ...profileForm, noHp: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              {/* Username + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username Login <span className="text-red-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={profileForm.username || ''}
                    onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password Baru <span className="text-slate-400 font-normal">(opsional)</span></label>
                  <input
                    type="password"
                    placeholder="Kosongkan jika tidak diubah"
                    onChange={e => {
                      if (e.target.value) setProfileForm({ ...profileForm, password: e.target.value });
                      else {
                        const { password, ...rest } = profileForm as any;
                        setProfileForm(rest);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  />
                </div>
              </div>

              {/* E-Sign Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-800">Tanda Tangan Digital (E-Sign)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileForm.eSignEnabled || false}
                      onChange={e => setProfileForm({ ...profileForm, eSignEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-checked:bg-emerald-600 rounded-full transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                  </label>
                </div>
                {profileForm.eSignEnabled && (
                  <div>
                    <div
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 flex flex-col items-center cursor-pointer transition min-h-[80px] justify-center"
                      onClick={() => signatureInputRef.current?.click()}
                    >
                      {profileForm.fotoTandaTangan ? (
                        <img src={profileForm.fotoTandaTangan} alt="Tanda Tangan" className="h-14 object-contain" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-slate-400 mb-1" />
                          <p className="text-[11px] text-slate-500">Klik untuk upload tanda tangan (PNG/JPG)</p>
                        </>
                      )}
                    </div>
                    <input ref={signatureInputRef} type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile || profileSuccess}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-amber-300 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingProfile ? 'Menyimpan...' : profileSuccess ? 'Tersimpan!' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
