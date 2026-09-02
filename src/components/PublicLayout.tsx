import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Scale, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="print:hidden bg-[#0a2e1e] text-slate-300 border-t border-white/10 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo-pidmil.png"
                alt="Logo PIDMIL"
                className="w-8 h-8 object-contain shrink-0"
              />
              <span className="font-bold text-white text-sm">JAMPIDMIL</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Jaksa Agung Muda Bidang Pidana Militer — Kejaksaan Agung Republik Indonesia.
            </p>
          </div>

          {/* Kontak */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Kontak</p>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>Jl. Sultan Hasanuddin No. 1, Kebayoran Baru, Jakarta Selatan 12160</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>(+62) 8956 1313 1263</span>
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Layanan</p>
            <div className="space-y-1.5 text-xs">
              <Link to="/formulir" className="block text-slate-400 hover:text-white transition">Ajukan Permohonan T-10</Link>
              <Link to="/lacak" className="block text-slate-400 hover:text-white transition">Lacak Status Permohonan</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4 text-center text-[11px] text-slate-500">
          © 2026 JAMPIDMIL — Kejaksaan Agung Republik Indonesia. Seluruh hak cipta dilindungi.
        </div>
      </footer>
    </div>
  );
};
