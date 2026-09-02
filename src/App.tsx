import React, { useState, useEffect } from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { PublicForm } from './components/PublicForm';
import { TrackingView } from './components/TrackingView';
import { AdminDashboard } from './components/AdminDashboard';
import { BlueprintDocs } from './components/BlueprintDocs';
import { SuratT10Viewer } from './components/SuratT10Viewer';
import { AdminTahananPage } from './components/AdminTahananPage';
import { AdminAkunPage } from './components/AdminAkunPage';
import { AdminKunjunganPage } from './components/AdminKunjunganPage';
import { PermohonanT10, SystemSettings, StatusPermohonan } from './types';
import { DEFAULT_SETTINGS } from './data/blueprintData';

export default function App() {
  const [permohonanList, setPermohonanList] = useState<PermohonanT10[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [trackingQuery, setTrackingQuery] = useState<string>('');
  const [viewingDoc, setViewingDoc] = useState<PermohonanT10 | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Fetch initial data from server API
  const fetchPermohonan = async () => {
    try {
      const resp = await fetch('/api/permohonan');
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          setPermohonanList(json.data);
        }
      }
    } catch (err) {
      console.warn('Fallback to local state:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const resp = await fetch('/api/settings');
      if (resp.ok) {
        const json = await resp.json();
        if (json.status === 'success' && json.data) {
          setSystemSettings(json.data);
        }
      }
    } catch (err) {
      console.warn('Settings fallback:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchPermohonan(), fetchSettings()])
      .catch(console.warn)
      .finally(() => setIsAppLoading(false));
  }, []);

  const handleUpdateStatus = async (
    id: string,
    newStatus: StatusPermohonan,
    catatan?: string,
    namaPetugas?: string,
    penandatanganData?: {
      nama?: string;
      pangkat?: string;
      nip?: string;
      tipeIdentitas?: 'NIP' | 'NRP';
      jabatan?: string;
      ttdUrl?: string;
    }
  ) => {
    try {
      const loggedInUserRaw = localStorage.getItem('userAccount');
      const currentUser = loggedInUserRaw ? JSON.parse(loggedInUserRaw) : null;

      const resp = await fetch(`/api/permohonan/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || '',
          'x-user-direktorat': currentUser?.direktorat || 'Penuntutan',
          'x-user-nip': currentUser?.nip || '',
        },
        body: JSON.stringify({
          status: newStatus,
          catatanPetugas: catatan,
          namaPetugasPemeriksa: namaPetugas,
          penandatanganNama: penandatanganData?.nama,
          penandatanganPangkat: penandatanganData?.pangkat,
          penandatanganNip: penandatanganData?.nip,
          penandatanganTipeIdentitas: penandatanganData?.tipeIdentitas || 'NIP',
          penandatanganJabatan: penandatanganData?.jabatan,
          penandatanganTtdUrl: penandatanganData?.ttdUrl,
        }),
      });
      if (resp.ok) {
        await fetchPermohonan();
      } else {
        const errJson = await resp.json();
        alert(errJson.message || 'Gagal mengubah status permohonan.');
      }
    } catch (err) {
      console.error('Update status error:', err);
      setPermohonanList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus, catatanPetugas: catatan || item.catatanPetugas } : item))
      );
    }
  };

  const handleSaveSettings = async (newSettings: SystemSettings) => {
    try {
      const loggedInUserRaw = localStorage.getItem('userAccount');
      const currentUser = loggedInUserRaw ? JSON.parse(loggedInUserRaw) : null;

      const resp = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || 'Admin',
          'x-user-direktorat': currentUser?.direktorat || 'Penuntutan',
          'x-user-nip': currentUser?.nip || '',
        },
        body: JSON.stringify(newSettings),
      });
      if (resp.ok) {
        const json = await resp.json();
        setSystemSettings(json.data);
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setSystemSettings(newSettings);
    }
  };

  const handleNewSubmission = (newPermohonan: PermohonanT10) => {
    setPermohonanList((prev) => [newPermohonan, ...prev]);
  };

  const handleTrackSubmission = (identifier: string) => {
    setTrackingQuery(identifier);
    setViewingDoc(null);
  };

  const handleViewDoc = (item: PermohonanT10) => {
    setViewingDoc(item);
  };

  if (isAppLoading) {
    return <LoadingScreen message="Menghubungkan & Memuat Portal Layanan T-10 JAMPIDMIL..." />;
  }

  return (
    <BrowserRouter>
      {/* Global Document Viewer Overlay */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
          <SuratT10Viewer
            permohonan={viewingDoc}
            settings={systemSettings}
            onBack={() => setViewingDoc(null)}
          />
        </div>
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          
          {/* Default / Fallback Routes */}
          <Route path="formulir" element={
            <PublicForm
              direktorat="Penuntutan"
              onSuccess={handleNewSubmission}
              onViewDoc={handleViewDoc}
              onTrack={handleTrackSubmission}
            />
          } />
          <Route path="lacak" element={
            <TrackingView
              initialQuery={trackingQuery}
              onViewDoc={handleViewDoc}
            />
          } />

          {/* Rute Khusus Direktorat Penuntutan */}
          <Route path="penuntutan/formulir" element={
            <PublicForm
              direktorat="Penuntutan"
              onSuccess={handleNewSubmission}
              onViewDoc={handleViewDoc}
              onTrack={handleTrackSubmission}
            />
          } />
          {/* Redirect lama /penuntutan/lacak ke /lacak */}
          <Route path="penuntutan/lacak" element={<Navigate to="/lacak" replace />} />

          {/* Rute Khusus Direktorat Penindakan */}
          <Route path="penindakan/formulir" element={
            <PublicForm
              direktorat="Penindakan"
              onSuccess={handleNewSubmission}
              onViewDoc={handleViewDoc}
              onTrack={handleTrackSubmission}
            />
          } />
          {/* Redirect lama /penindakan/lacak ke /lacak */}
          <Route path="penindakan/lacak" element={<Navigate to="/lacak" replace />} />
        </Route>

        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Admin Routes (Protected by AdminLayout) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={
            isAppLoading ? <LoadingScreen /> : (
              <AdminDashboard
                permohonanList={permohonanList}
                systemSettings={systemSettings}
                onRefresh={fetchPermohonan}
                onUpdateStatus={handleUpdateStatus}
                onSaveSettings={handleSaveSettings}
                onViewDoc={handleViewDoc}
              />
            )
          } />
          <Route path="blueprint" element={<BlueprintDocs />} />
          <Route path="tahanan" element={<AdminTahananPage />} />
          <Route path="akun" element={<AdminAkunPage />} />
          <Route path="kunjungan" element={<AdminKunjunganPage />} />
        </Route>

        {/* Catch All Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
