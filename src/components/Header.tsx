import React, { useState, useRef, useEffect } from 'react';
import { Scale, FileText, Search, Home, Menu, X, ShieldAlert, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'penuntutan' | 'penindakan' | null>(null);
  
  const navRef = useRef<HTMLDivElement>(null);

  const isPenuntutan = location.pathname.includes('/penuntutan');
  const isPenindakan = location.pathname.includes('/penindakan');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setActiveDropdown(null);
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleDropdown = (menu: 'penuntutan' | 'penindakan') => {
    setActiveDropdown(prev => prev === menu ? null : menu);
  };

  return (
    <header className="bg-[#0a2e1e] text-white sticky top-0 z-40 shadow-lg border-b border-emerald-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4" ref={navRef}>
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group transition-transform active:scale-95 duration-150">
          <img
            src="/logo-pidmil.png"
            alt="Logo PIDMIL"
            className="w-10 h-10 object-contain drop-shadow-sm shrink-0 transition-transform group-hover:scale-105 duration-200"
          />
          <div className="hidden sm:block">
            <p className="text-[11px] font-semibold text-amber-400 leading-none uppercase tracking-wider">Kejaksaan RI</p>
            <p className="text-sm font-bold text-white leading-snug">JAMPIDMIL · Izin Kunjungan T-10</p>
          </div>
          <div className="sm:hidden">
            <p className="text-sm font-bold text-white">JAMPIDMIL</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            to="/"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
              location.pathname === '/'
                ? 'bg-amber-400 text-[#0a2e1e] shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home className="w-4 h-4" />
            Beranda
          </Link>

          {/* Menu Dropdown: Direktorat Penuntutan */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('penuntutan')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 select-none ${
                activeDropdown === 'penuntutan' || (isPenuntutan && activeDropdown === null)
                  ? 'bg-emerald-800/90 text-amber-300 border border-amber-400/40 shadow-inner'
                  : 'text-slate-200 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Direktorat Penuntutan</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                activeDropdown === 'penuntutan' ? 'rotate-180 text-amber-300' : 'text-slate-400'
              }`} />
            </button>

            {activeDropdown === 'penuntutan' && (
              <div className="absolute left-0 top-full pt-2 w-64 z-50 animate-dropdown-in origin-top-left">
                <div className="bg-[#0b2d1e]/95 backdrop-blur-md border border-emerald-600/50 rounded-2xl shadow-2xl p-2 space-y-1.5 overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-emerald-800/50">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                      Layanan Penuntutan (PMpt.1)
                    </span>
                  </div>
                  <Link
                    to="/penuntutan/formulir"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-emerald-800/80 transition-all duration-150 group hover:translate-x-1"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-950/80 flex items-center justify-center border border-emerald-600/40 text-amber-400 group-hover:bg-amber-400 group-hover:text-[#0a2e1e] transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-100 group-hover:text-white">Formulir T-10</p>
                      <p className="text-[10px] text-slate-400 font-normal">Pengajuan izin kunjungan tahanan</p>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Menu Dropdown: Direktorat Penindakan */}
          <div className="relative">
            <button
              onClick={() => toggleDropdown('penindakan')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 select-none ${
                activeDropdown === 'penindakan' || (isPenindakan && activeDropdown === null)
                  ? 'bg-purple-950/90 text-purple-200 border border-purple-400/40 shadow-inner'
                  : 'text-slate-200 hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-300" />
              <span>Direktorat Penindakan</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                activeDropdown === 'penindakan' ? 'rotate-180 text-purple-200' : 'text-slate-400'
              }`} />
            </button>

            {activeDropdown === 'penindakan' && (
              <div className="absolute left-0 top-full pt-2 w-64 z-50 animate-dropdown-in origin-top-left">
                <div className="bg-[#18112e]/95 backdrop-blur-md border border-purple-700/50 rounded-2xl shadow-2xl p-2 space-y-1.5 overflow-hidden">
                  <div className="px-3 py-1.5 border-b border-purple-800/50">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-300">
                      Layanan Penindakan (PMpd.1)
                    </span>
                  </div>
                  <Link
                    to="/penindakan/formulir"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-purple-900/60 transition-all duration-150 group hover:translate-x-1"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-950 flex items-center justify-center border border-purple-600/40 text-purple-300 group-hover:bg-purple-400 group-hover:text-[#18112e] transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-100 group-hover:text-white">Formulir T-10</p>
                      <p className="text-[10px] text-slate-400 font-normal">Pengajuan izin tahap penyidikan</p>
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Single Unified Lacak Menu */}
          <Link
            to="/lacak"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
              location.pathname === '/lacak'
                ? 'bg-amber-400 text-[#0a2e1e] shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Search className="w-4 h-4" />
            Lacak Permohonan
          </Link>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-white/10 transition active:scale-90 duration-150"
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5 text-slate-200" />}
        </button>
      </div>

      {/* Mobile Dropdown Menu with Transition */}
      {mobileOpen && (
        <div className="md:hidden border-t border-emerald-900/60 bg-[#082417] px-4 py-3 space-y-2 animate-slide-down shadow-xl">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 hover:bg-white/10 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4 text-amber-400" />
            Beranda
          </Link>

          <Link
            to="/penuntutan/formulir"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-emerald-900/60 active:scale-95 transition-all"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            Formulir T-10 Penuntutan
          </Link>

          <Link
            to="/penindakan/formulir"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-purple-950/60 active:scale-95 transition-all"
          >
            <ShieldAlert className="w-4 h-4 text-purple-300" />
            Formulir T-10 Penindakan
          </Link>

          <Link
            to="/lacak"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-300 bg-emerald-900/60 active:scale-95 transition-all"
          >
            <Search className="w-4 h-4 text-amber-400" />
            Lacak Permohonan (Semua Direktorat)
          </Link>
        </div>
      )}
    </header>
  );
};
