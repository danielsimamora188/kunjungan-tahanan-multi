import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  Layers, 
  Cpu, 
  Database, 
  ShieldCheck, 
  PhoneCall, 
  ExternalLink, 
  Terminal, 
  Play, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/blueprintData';

export const BlueprintDocs: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testStatus, setTestStatus] = useState<{ loading: boolean; result?: any; error?: string }>({ loading: false });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRunLiveTest = async () => {
    if (!testUrl.trim()) {
      setTestStatus({ loading: false, error: 'Silakan masukkan URL Web App Google Apps Script Anda.' });
      return;
    }

    setTestStatus({ loading: true, error: undefined, result: undefined });

    try {
      const resp = await fetch('/api/test-gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: testUrl.trim() }),
      });

      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        setTestStatus({ loading: false, result: data });
      } else {
        setTestStatus({ loading: false, error: data.message || 'Webhook mengembalikan status error.' });
      }
    } catch (err: any) {
      setTestStatus({ loading: false, error: err.message || 'Koneksi gagal.' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 border border-emerald-800 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4" /> Cetak Biru (Blueprint) & Panduan Teknis Sistem
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          Arsitektur Terintegrasi JAMPIDMIL T-10
        </h2>
        <p className="text-emerald-200/90 text-sm sm:text-base max-w-3xl leading-relaxed">
          Dokumentasi teknis spesifikasi sistem, logika anti-duplikasi penomoran naskah dinas, integrasi database Google Sheets melalui Google Apps Script, serta alur otomatisasi WhatsApp Gateway.
        </p>
      </div>

      {/* 5 Komponen Utama Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-800" />
          <span>5 Pilar Komponen Arsitektur Utama</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Komponen 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5">Frontend Publik & Admin</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dibangun dengan React.js 19, Vite, dan Tailwind CSS bertema resmi instansi (Deep Emerald Green <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-900">#064e3b</code> & Gold <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-700">#f59e0b</code>). Dilengkapi toggle mode Portal Publik dan Dashboard Admin.
            </p>
          </div>

          {/* Komponen 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5">Penomoran T-10 Anti-Duplikasi</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Format baku: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-900">B-001/J.5/Fd.1/2026</code>. Menggunakan atomic sequence counter dan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">LockService.getScriptLock()</code> untuk menjamin nomor berurutan tanpa tabrakan saat input bersamaan.
            </p>
          </div>

          {/* Komponen 3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5">Database Google Sheets & GAS</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Skrip backend Google Apps Script (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">doPost</code>) menerima JSON dari web portal, menyimpannya ke baris baru Google Sheets secara real-time dengan status awal <em>"Diproses"</em>.
            </p>
          </div>

          {/* Komponen 4 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-sm mb-3">
              4
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5">Validasi Identitas & NIK 16 Digit</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Validasi ketat sisi klien & server (regex <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">^\d{16}$</code>) dengan pengurai kode provinsi, tanggal lahir, dan jenis kelamin otomatis sebelum data disimpan ke database.
            </p>
          </div>

          {/* Komponen 5 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition md:col-span-2 lg:col-span-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm mb-3">
              5
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1.5">Otomasi WhatsApp Gateway</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Terintegrasi langsung dengan Fonnte / Wablas API. Otomatis mengirim pesan WhatsApp instan kepada Admin Piket JAMPIDMIL dan Pemohon saat pendaftaran dibuat atau saat status permohonan disetujui/terbit.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Google Apps Script Code Hub */}
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white font-mono">Code.gs (Google Apps Script)</h4>
              <p className="text-[11px] text-slate-400">Kode lengkap siap salin & pasang pada Google Spreadsheet</p>
            </div>
          </div>

          <button
            id="btn-copy-gas-code"
            onClick={handleCopyCode}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>Tersalin ke Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Seluruh Kode Script</span>
              </>
            )}
          </button>
        </div>

        {/* Code Viewer Container */}
        <div className="p-4 bg-slate-950 max-h-96 overflow-y-auto font-mono text-xs text-emerald-300 leading-relaxed">
          <pre className="whitespace-pre">{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>
      </div>

      {/* Step by Step Deployment Guide */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-800" />
          <span>Panduan Pemasangan Google Apps Script (Langkah demi Langkah)</span>
        </h3>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700">
          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <p className="font-bold text-slate-900">Buat Google Spreadsheet Baru</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold underline">sheets.new</a>, beri nama spreadsheet misalnya: <em>"DATABASE PERMOHONAN T-10 JAMPIDMIL 2026"</em>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <p className="font-bold text-slate-900">Buka Menu Extensions &gt; Apps Script</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Di menu Google Sheets, klik menu <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>. Hapus seluruh isi file default <code className="bg-slate-200 px-1 rounded">Code.gs</code>, lalu <strong>Paste (Tempel)</strong> kode di atas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <p className="font-bold text-slate-900">Konfigurasi Nomor WhatsApp & API Token</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Pada baris awal skrip (bagian <code className="bg-slate-200 px-1 rounded font-mono">CONFIG</code>), sesuaikan <code className="font-mono">ADMIN_WA_NUMBER</code> dengan nomor WhatsApp Admin Jampidmil dan <code className="font-mono">WA_API_TOKEN</code> dari provider Fonnte/Wablas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              4
            </span>
            <div>
              <p className="font-bold text-slate-900">Deploy sebagai Web App</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Klik tombol biru <strong>Deploy</strong> &rarr; <strong>New deployment</strong>. Pilih type <strong>Web App</strong>. Set:
              </p>
              <ul className="list-disc list-inside mt-1 text-xs text-slate-600 space-y-0.5">
                <li><strong>Execute as:</strong> <code>Me (akun Anda)</code></li>
                <li><strong>Who has access:</strong> <code>Anyone (Siapa saja)</code> <em>(Penting agar web portal dapat mengirimkan data)</em></li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-emerald-900 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              5
            </span>
            <div>
              <p className="font-bold text-slate-900">Hubungkan Web App URL ke Sistem Ini</p>
              <p className="text-slate-600 text-xs mt-0.5">
                Salin Web App URL yang dihasilkan (berakhiran <code className="bg-slate-200 px-1 rounded font-mono">/exec</code>), lalu masukkan ke form pengujian di bawah ini atau melalui menu <strong>Konfigurasi Integrasi</strong> di Dashboard Admin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Webhook Tester Component */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 sm:p-8 border border-emerald-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-white">
            Pengujian Langsung Webhook Google Apps Script
          </h3>
        </div>
        <p className="text-xs text-emerald-200">
          Uji URL Web App Google Apps Script Anda untuk memverifikasi bahwa skrip dapat menerima data JSON dan otomatis menulis baris ke spreadsheet.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="input-test-gas-url"
            type="url"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="flex-1 px-4 py-2.5 bg-emerald-900/80 border border-emerald-700 rounded-xl text-xs font-mono text-white placeholder-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            id="btn-run-gas-test"
            type="button"
            onClick={handleRunLiveTest}
            disabled={testStatus.loading || !testUrl.trim()}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {testStatus.loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play className="w-4 h-4 fill-slate-950" />
            )}
            <span>Jalankan Tes POST</span>
          </button>
        </div>

        {/* Result Feedback */}
        {testStatus.result && (
          <div className="p-4 bg-emerald-900/90 border border-emerald-600 rounded-xl text-xs space-y-1 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Respon Server: HTTP {testStatus.result.httpStatus} (Sukses)</span>
            </div>
            <pre className="p-2 bg-emerald-950 rounded font-mono text-[11px] text-amber-300 overflow-x-auto">
              {JSON.stringify(testStatus.result.response, null, 2)}
            </pre>
          </div>
        )}

        {testStatus.error && (
          <div className="p-4 bg-red-900/80 border border-red-600 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{testStatus.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
