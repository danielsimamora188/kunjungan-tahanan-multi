import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ShieldCheck, FileCheck2, Scale, ShieldAlert, Building2 } from 'lucide-react';

const FEATURES = [
  {
    icon: Clock,
    color: 'text-emerald-700 bg-emerald-50',
    title: 'Proses Cepat & Efisien',
    desc: 'Pendaftaran digital mengurangi antrean dan mempercepat verifikasi petugas piket.',
  },
  {
    icon: ShieldCheck,
    color: 'text-amber-700 bg-amber-50',
    title: 'Data Terlindungi',
    desc: 'Seluruh data identitas pemohon dikelola sesuai standar keamanan dan perlindungan data pribadi.',
  },
  {
    icon: FileCheck2,
    color: 'text-blue-700 bg-blue-50',
    title: 'Dokumen Resmi T-10',
    desc: 'Permohonan disetujui menghasilkan surat izin resmi yang dapat digunakan saat kunjungan.',
  },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-[#0a2e1e] overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#0a2e1e] to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-block mb-4 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-400 border border-amber-500/30 rounded-full bg-amber-500/10">
              Layanan Resmi JAMPIDMIL · Kejaksaan RI
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-5">
              Portal Izin Kunjungan Tahanan{' '}
              <span className="text-amber-400">Jaksa Agung Muda Bidang Pidana Militer</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
              Sistem permohonan izin kunjungan tahanan (T-10) untuk <strong>Direktorat Penuntutan</strong> dan <strong>Direktorat Penindakan</strong> yang cepat, transparan, dan terintegrasi secara digital.
            </p>
          </div>

          {/* Kartu Pilihan Direktorat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* Kartu Direktorat Penuntutan */}
            <div className="bg-emerald-900/60 border border-emerald-500/40 hover:border-amber-400/80 rounded-2xl p-6 sm:p-7 backdrop-blur-md shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Direktorat</span>
                  <h2 className="text-xl font-bold text-white">Direktorat Penuntutan</h2>
                </div>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
                Pengurusan izin kunjungan tahanan tahap penuntutan. Disahkan oleh <strong>Penuntut Umum Koneksitas</strong> dengan nomor registrasi <code>PMpt.1</code>.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/penuntutan/formulir"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0a2e1e] bg-amber-400 hover:bg-amber-300 rounded-xl transition shadow-md"
                >
                  Ajukan Permohonan <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/lacak"
                  className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-white border border-white/20 hover:bg-white/10 rounded-xl transition"
                >
                  Lacak
                </Link>
              </div>
            </div>

            {/* Kartu Direktorat Penindakan */}
            <div className="bg-slate-900/70 border border-purple-500/40 hover:border-amber-400/80 rounded-2xl p-6 sm:p-7 backdrop-blur-md shadow-xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center border border-purple-400/30">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Direktorat</span>
                  <h2 className="text-xl font-bold text-white">Direktorat Penindakan</h2>
                </div>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mb-6 leading-relaxed">
                Pengurusan izin kunjungan tahanan tahap penyidikan/penindakan. Disahkan oleh <strong>Penyidik Koneksitas</strong> dengan nomor registrasi <code>PMpd.1</code>.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to="/penindakan/formulir"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 rounded-xl transition shadow-md"
                >
                  Ajukan Permohonan <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/lacak"
                  className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-white border border-white/20 hover:bg-white/10 rounded-xl transition"
                >
                  Lacak
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info Cards Section */}
      <section className="bg-slate-100/80 border-y border-slate-200/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jam Operasional Layanan</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">Senin – Jumat, 08.00 – 16.00 WIB</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ketentuan Pengajuan</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">Minimal 1 Hari Sebelum Jadwal Kunjungan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Keunggulan Layanan</h2>
            <p className="mt-3 text-slate-500 text-sm max-w-xl mx-auto">
              Kami berkomitmen memberikan pelayanan terbaik bagi keluarga dan penasihat hukum tahanan Jaksa Agung Muda Bidang Pidana Militer.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-slate-50 py-12 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-[#0a2e1e] rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Siap Mengajukan Permohonan?</h3>
              <p className="text-slate-400 text-sm">
                Pilih direktorat yang menangani tahanan militer Anda untuk mengisi formulir digital resmi.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/penuntutan/formulir"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-[#0a2e1e] bg-amber-400 hover:bg-amber-300 rounded-xl transition"
              >
                Penuntutan <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/penindakan/formulir"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 rounded-xl transition"
              >
                Penindakan <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
