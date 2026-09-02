import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { INITIAL_SEED_PERMOHONAN, INITIAL_SEED_AKUN, INITIAL_SEED_TAHANAN, DEFAULT_SETTINGS } from "./src/data/blueprintData";
import { PermohonanT10, SystemSettings, CreatePermohonanInput, Tahanan, AkunUser, Direktorat } from "./src/types";

export const app = express();

// In-Memory persistent store for server session
let permohonanList: PermohonanT10[] = [...INITIAL_SEED_PERMOHONAN];
const defaultGasUrl = process.env.GAS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbyU4X1mYGhuQ_3CliJD8WT4U5mp4vwNOnNUg-0b4uWF2jHVBxXiZ-X7GdnBq3IJPN1XiQ/exec";
let systemSettings: SystemSettings = {
  ...DEFAULT_SETTINGS,
  googleAppsScriptUrl: defaultGasUrl,
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1_98HePK55aFpwm9eNpeMBjQZU8nH1wg0bN7m7U-tiV4/edit?usp=sharing",
  googleDocTemplateUrl: "https://docs.google.com/document/d/1EvD3bMe-K_6-RliZa6kdbed6Ef_IRdlb/edit?usp=sharing&ouid=109982999574552257586&rtpof=true&sd=true",
};

let tahananList: Tahanan[] = [...INITIAL_SEED_TAHANAN];
let akunList: AkunUser[] = [...INITIAL_SEED_AKUN];

/**
 * Dynamic / Gap-filling Number Generator for T-10
 * Penuntutan: Format Baku: B-{nomorUrut}/PM.3/PMpt.1/{month}/{year}
 * Penindakan: Format Baku: B-{nomorUrut}/PM.3/PMpd.1/{month}/{year}
 */
function generateNextT10Number(direktorat: Direktorat = 'Penuntutan'): { nomorSurat: string; nomorUrut: number } {
  const dirList = permohonanList.filter(p => (p.direktorat || 'Penuntutan') === direktorat);
  const usedNumbers = new Set<number>();
  
  for (const p of dirList) {
    if (p.nomorUrut && typeof p.nomorUrut === "number") {
      usedNumbers.add(p.nomorUrut);
    }
    const match = String(p.nomorSurat || "").match(/^B-(\d+)\//i);
    if (match) {
      usedNumbers.add(parseInt(match[1], 10));
    }
  }

  let nextNum = 1;
  while (usedNumbers.has(nextNum)) {
    nextNum++;
  }

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const kodeDir = direktorat === 'Penindakan' ? 'PMpd.1' : 'PMpt.1';
  const nomorSurat = `B-${nextNum}/PM.3/${kodeDir}/${month}/${year}`;
  return { nomorSurat, nomorUrut: nextNum };
}

/**
 * Helper to dispatch WhatsApp message via Fonnte / Wablas or internal simulator
 */
async function syncAllToGAS(action: string, payload: any, direktorat?: Direktorat) {
  const targetUrl = (direktorat === 'Penindakan' && systemSettings.googleAppsScriptUrlPenindakan) 
    ? systemSettings.googleAppsScriptUrlPenindakan 
    : systemSettings.googleAppsScriptUrl;

  if (!targetUrl) return;

  try {
    await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, direktorat, ...payload }),
    });
  } catch (err) {
    console.warn("GAS sync error (non-fatal):", err);
  }
}

let lastFetchTime = 0;
let gasFetchPromise: Promise<void> | null = null;
const CACHE_TTL_MS = 15000;

async function fetchAllFromGAS(forceRefresh = false) {
  if (!systemSettings.googleAppsScriptUrl && !systemSettings.googleAppsScriptUrlPenindakan) return;

  const now = Date.now();
  if (!forceRefresh && now - lastFetchTime < CACHE_TTL_MS) {
    return;
  }

  if (gasFetchPromise) {
    await gasFetchPromise;
    return;
  }

  gasFetchPromise = (async () => {
    try {
      const urls: { url: string; dir: Direktorat }[] = [];
      if (systemSettings.googleAppsScriptUrl) {
        urls.push({ url: systemSettings.googleAppsScriptUrl, dir: 'Penuntutan' });
      }
      if (systemSettings.googleAppsScriptUrlPenindakan && systemSettings.googleAppsScriptUrlPenindakan !== systemSettings.googleAppsScriptUrl) {
        urls.push({ url: systemSettings.googleAppsScriptUrlPenindakan, dir: 'Penindakan' });
      }

      for (const { url, dir } of urls) {
        try {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "get_all" }),
          });
          if (!resp.ok) continue;
          const json = await resp.json();
          lastFetchTime = Date.now();
          if (json.status === "success") {
            if (Array.isArray(json.permohonan)) {
              const mappedPermohonan: PermohonanT10[] = json.permohonan.map((p: any) => ({
                ...p,
                direktorat: p.direktorat || (String(p.nomorSurat || "").includes("PMpd") ? 'Penindakan' : dir)
              }));
              
              // Merge or replace based on direktorat
              const otherPermohonan = permohonanList.filter(p => p.direktorat !== dir);
              permohonanList = [...otherPermohonan, ...mappedPermohonan];
            }
            if (Array.isArray(json.tahanan)) {
              const mappedTahanan: Tahanan[] = json.tahanan.map((t: any) => {
                const existing = tahananList.find(item => item.id === t.id || item.namaLengkap === t.namaLengkap);
                return {
                  id: t.id || `t-${Date.now()}`,
                  namaLengkap: t.namaLengkap || t.namaTahanan || '',
                  namaTahanan: t.namaTahanan || t.namaLengkap || '',
                  direktorat: t.direktorat || dir,
                  pangkatNrpTahanan: (t.pangkatNrpTahanan && t.pangkatNrpTahanan !== '-') ? t.pangkatNrpTahanan : (existing?.pangkatNrpTahanan && existing.pangkatNrpTahanan !== '-') ? existing.pangkatNrpTahanan : (t.pangkat || '-'),
                  satuanTahanan: (t.satuanTahanan && t.satuanTahanan !== '-') ? t.satuanTahanan : (existing?.satuanTahanan && existing.satuanTahanan !== '-') ? existing.satuanTahanan : (t.satuan || '-'),
                  tempatLahir: t.tempatLahir || '',
                  tanggalLahir: t.tanggalLahir || '',
                  jenisKelamin: t.jenisKelamin || 'Laki-laki',
                  kebangsaan: t.kebangsaan || 'Indonesia',
                  tempatTinggal: t.tempatTinggal || '',
                  agama: t.agama || '',
                  pekerjaan: t.pekerjaan || '',
                  pendidikan: t.pendidikan || '',
                  nik: t.nik || '',
                  tempatDitahan: t.tempatDitahan || t.lokasiRutan || '',
                  lokasiRutan: t.lokasiRutan || t.tempatDitahan || ''
                };
              });
              const otherTahanan = tahananList.filter(t => t.direktorat !== dir);
              tahananList = [...otherTahanan, ...mappedTahanan];
            }
            if (Array.isArray(json.akun) && json.akun.length > 0) {
              const mappedAkun: AkunUser[] = json.akun.map((a: any) => {
                let tipeId: 'NIP' | 'NRP' = (a.tipeIdentitas === 'NRP' || a.tipeIdentitas === 'NIP') ? a.tipeIdentitas : 'NIP';
                let pangkat = a.pangkat;
                let jabatan = a.jabatan;
                let role = a.role;
                const d: Direktorat = a.direktorat || (String(role).toLowerCase().includes("penyidik") ? 'Penindakan' : dir);

                if (a.tipeIdentitas && a.tipeIdentitas !== 'NIP' && a.tipeIdentitas !== 'NRP') {
                  pangkat = a.tipeIdentitas;
                  jabatan = a.pangkat || a.jabatan;
                  tipeId = 'NIP';
                }

                if (role !== 'Admin' && role !== 'Staff' && role !== 'Penuntut Umum Koneksitas' && role !== 'Penyidik Koneksitas') {
                  if (String(role).toLowerCase().includes('admin') || String(jabatan).toLowerCase().includes('admin')) {
                    role = 'Admin';
                  } else if (String(role).toLowerCase().includes('penyidik') || String(jabatan).toLowerCase().includes('penyidik')) {
                    role = 'Penyidik Koneksitas';
                  } else if (String(role).toLowerCase().includes('penuntut') || String(jabatan).toLowerCase().includes('penuntut')) {
                    role = 'Penuntut Umum Koneksitas';
                  } else {
                    role = 'Staff';
                  }
                }

                return {
                  id: a.id || `a-${Date.now()}`,
                  nama: a.nama || 'Pengguna',
                  nip: a.nip || '',
                  tipeIdentitas: tipeId,
                  pangkat: pangkat || '',
                  jabatan: jabatan || '',
                  role: role,
                  direktorat: d,
                  username: a.username || '',
                  password: a.password || '',
                  email: a.email || '',
                  noHp: a.noHp || '',
                  eSignEnabled: !!a.eSignEnabled,
                  fotoTandaTangan: a.fotoTandaTangan || ''
                };
              });
              const otherAkun = akunList.filter(a => a.direktorat !== dir);
              akunList = [...otherAkun, ...mappedAkun];
            }
          }
        } catch (e) {
          console.warn(`Fetch error for ${dir}:`, e);
        }
      }
    } catch (err) {
      console.warn("GAS fetch error (non-fatal):", err);
    } finally {
      gasFetchPromise = null;
    }
  })();

  await gasFetchPromise;
}

async function dispatchWhatsAppNotification(
  provider: string,
  apiKey: string,
  targetPhone: string,
  message: string
): Promise<{ success: boolean; detail?: string }> {
  if (!targetPhone) return { success: false, detail: "Nomor tujuan WhatsApp tidak valid." };

  if (provider === "simulasi" || !apiKey) {
    console.log(`[WA SIMULATOR] Mengirim ke ${targetPhone}:\n${message}`);
    return { success: true, detail: "Terkirim via Simulator Gateway Internal JAMPIDMIL." };
  }

  try {
    if (provider === "fonnte") {
      const resp = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: targetPhone,
          message,
        }),
      });
      const data = await resp.json();
      return { success: resp.ok, detail: JSON.stringify(data) };
    } else if (provider === "wablas") {
      const resp = await fetch("https://api.wablas.com/api/send-message", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: targetPhone,
          message,
        }),
      });
      const data = await resp.json();
      return { success: resp.ok, detail: JSON.stringify(data) };
    }
  } catch (err: any) {
    console.error("Gagal mengirim WhatsApp:", err);
    return { success: false, detail: err?.message || String(err) };
  }

  return { success: true, detail: "Simulasi berhasil." };
}

async function startServer() {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  app.use(express.json());

  // ==========================================
  // API ROUTES
  // ==========================================

  // 0. Admin & Staff Login Endpoint
  app.post("/api/login", (req: Request, res: Response) => {
    const { username, password } = req.body;
    const cleanUser = String(username || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();

    if (!cleanUser) {
      return res.status(400).json({ status: "error", message: "Username atau NIP wajib diisi." });
    }

    // 1. Search in live akunList safely
    const matchedAccount = akunList.find(a => {
      const uName = String(a.username || "").trim().toLowerCase();
      const uNip = String(a.nip || "").trim().toLowerCase();
      const uNama = String(a.nama || "").trim().toLowerCase();
      const uEmail = String(a.email || "").trim().toLowerCase();

      return (
        (uName && uName === cleanUser) ||
        (uNip && uNip === cleanUser) ||
        (uNama && uNama === cleanUser) ||
        (uEmail && uEmail === cleanUser)
      );
    });

    if (matchedAccount) {
      const expectedPass = String(matchedAccount.password || "").trim();
      if (expectedPass && expectedPass !== cleanPass) {
        return res.status(401).json({ status: "error", message: "Password yang Anda masukkan salah." });
      }

      return res.json({
        status: "success",
        token: `mock-token-${matchedAccount.id}-${Date.now()}`,
        user: matchedAccount,
      });
    }

    return res.status(401).json({ status: "error", message: "Username, NIP, atau password salah." });
  });

  // 1. Health Check
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      agency: "JAMPIDMIL - Kejaksaan Republik Indonesia",
      service: "Layanan Permohonan Izin Kunjungan Tahanan (T-10) Terpadu",
      direktoratList: ["Penuntutan", "Penindakan"],
      totalSubmissions: permohonanList.length,
      time: new Date().toISOString(),
    });
  });

  // 2. Get All / Filter Permohonan
  app.get("/api/permohonan", async (req: Request, res: Response) => {
    await fetchAllFromGAS();
    const q = (req.query.q as string || "").toLowerCase();
    const status = req.query.status as string;
    const direktorat = req.query.direktorat as string;

    let filtered = [...permohonanList];

    if (direktorat && direktorat !== "Semua") {
      filtered = filtered.filter((item) => item.direktorat === direktorat);
    }

    if (status && status !== "Semua") {
      filtered = filtered.filter((item) => item.status === status);
    }

    if (q) {
      filtered = filtered.filter((item) =>
        item.nomorSurat.toLowerCase().includes(q) ||
        item.nikPemohon.includes(q) ||
        item.namaPemohon.toLowerCase().includes(q) ||
        item.namaTahanan.toLowerCase().includes(q) ||
        item.satuanTahanan.toLowerCase().includes(q) ||
        item.noWhatsApp.includes(q)
      );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      status: "success",
      total: filtered.length,
      data: filtered,
    });
  });

  // 3. Get Single Permohonan by ID, Nomor Surat, or NIK
  app.get("/api/permohonan/:identifier", (req: Request, res: Response) => {
    const { identifier } = req.params;
    const cleanId = decodeURIComponent(identifier).trim().toLowerCase();

    const found = permohonanList.find(
      (item) =>
        item.id.toLowerCase() === cleanId ||
        item.nomorSurat.toLowerCase() === cleanId ||
        item.nikPemohon.toLowerCase() === cleanId
    );

    if (!found) {
      const matches = permohonanList.filter((item) => item.nikPemohon === cleanId);
      if (matches.length > 0) {
        return res.json({ status: "success", multiple: true, data: matches });
      }
      return res.status(404).json({ status: "error", message: "Data permohonan tidak ditemukan." });
    }

    return res.json({ status: "success", data: found });
  });

  // 4. Create New Permohonan (POST)
  app.post("/api/permohonan", async (req: Request, res: Response) => {
    try {
      const input: CreatePermohonanInput = req.body;
      const targetDirektorat: Direktorat = input.direktorat === 'Penindakan' ? 'Penindakan' : 'Penuntutan';

      if (!input.namaPemohon || !input.namaTahanan || !input.tanggalKunjungan) {
        return res.status(400).json({
          status: "error",
          message: "Harap lengkapi semua kolom wajib (Nama Pemohon, Nama Tahanan, dan Tanggal Kunjungan).",
        });
      }

      await fetchAllFromGAS(true);

      const currentYear = new Date().getFullYear();
      const { nomorSurat, nomorUrut } = generateNextT10Number(targetDirektorat);
      const now = new Date().toISOString();

      const newPermohonan: PermohonanT10 = {
        id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        direktorat: targetDirektorat,
        nomorSurat,
        nomorUrut,
        tahun: currentYear,
        namaPemohon: input.namaPemohon.trim(),
        nikPemohon: input.nikPemohon.trim(),
        noWhatsApp: input.noWhatsApp.trim(),
        hubungan: input.hubungan || "Keluarga Inti",
        alamatPemohon: input.alamatPemohon || "Tidak dicantumkan",
        pekerjaanPemohon: input.pekerjaanPemohon || "Masyarakat Umum",
        fotoKTP: input.fotoKTP || "",
        namaTahanan: input.namaTahanan.trim(),
        pangkatNrpTahanan: input.pangkatNrpTahanan || "Prajurit TNI / Tahanan Militer",
        satuanTahanan: input.satuanTahanan || "Kodam Jaya / Mabes TNI",
        lokasiRutan: input.lokasiRutan || "RTM Guntur Pomdam Jaya",
        nomorPerkara: `BP-${String(nomorUrut).padStart(2, "0")}/${targetDirektorat === 'Penindakan' ? 'PID.MIL-DIK' : 'PID.MIL-TUT'}/JAMPIDMIL/${currentYear}`,
        tanggalKunjungan: input.tanggalKunjungan,
        sesiKunjungan: input.sesiKunjungan || "Sesi Pagi (09.00 - 11.30 WIB)",
        keperluanKunjungan: input.keperluanKunjungan || "Kunjungan Izin Besuk Tahanan",
        jumlahPengunjung: input.jumlahPengunjung || 1,
        namaPengikut: input.namaPengikut || "",
        status: "Diproses",
        catatanPetugas: `Permohonan baru diterima via Portal Online JAMPIDMIL (${targetDirektorat}). Menunggu disposisi dan verifikasi pejabat.`,
        createdAt: now,
        updatedAt: now,
        syncedToGoogleSheets: false,
        waNotifiedAdmin: false,
        waNotifiedPemohon: false,
      };

      permohonanList.unshift(newPermohonan);

      // Sync to respective Google Spreadsheet
      const dirPermohonan = permohonanList.filter(p => p.direktorat === targetDirektorat);
      await syncAllToGAS("sync_permohonan", { list: dirPermohonan }, targetDirektorat);
      newPermohonan.syncedToGoogleSheets = true;

      // WhatsApp Notification Trigger
      const pesanAdmin =
        `🚨 *NOTIFIKASI PERMOHONAN T-10 (${targetDirektorat.toUpperCase()}) MASUK*\n` +
        `🏛 *JAMPIDMIL - KEJAKSAAN AGUNG RI*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📄 *No. Surat T-10:* ${nomorSurat}\n` +
        `👤 *Pemohon:* ${newPermohonan.namaPemohon}\n` +
        `🆔 *NIK:* ${newPermohonan.nikPemohon}\n` +
        `📱 *WhatsApp:* ${newPermohonan.noWhatsApp}\n` +
        `🔗 *Hubungan:* ${newPermohonan.hubungan}\n\n` +
        `⚔️ *Tahanan Militer:* ${newPermohonan.namaTahanan} (${newPermohonan.satuanTahanan})\n` +
        `📍 *Lokasi:* ${newPermohonan.lokasiRutan}\n` +
        `📅 *Tanggal:* ${newPermohonan.tanggalKunjungan} (${newPermohonan.sesiKunjungan})\n\n` +
        `📌 *Status:* 🟡 *DIPROSES*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`;

      const waAdminResult = await dispatchWhatsAppNotification(
        systemSettings.waGatewayProvider,
        systemSettings.waApiKey,
        systemSettings.waAdminPhone,
        pesanAdmin
      );
      if (waAdminResult.success) {
        newPermohonan.waNotifiedAdmin = true;
      }

      return res.status(201).json({
        status: "success",
        message: `Permohonan izin kunjungan T-10 (${targetDirektorat}) berhasil dibuat.`,
        data: newPermohonan,
      });
    } catch (error: any) {
      console.error("Error creating permohonan:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Gagal memproses permohonan.",
      });
    }
  });

  // 5. Update Status Permohonan (Admin)
  app.patch("/api/permohonan/:id/status", async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      status,
      catatanPetugas,
      namaPetugasPemeriksa,
      penandatanganNama,
      penandatanganPangkat,
      penandatanganNip,
      penandatanganTipeIdentitas,
      penandatanganJabatan,
      penandatanganTtdUrl
    } = req.body;

    const itemIndex = permohonanList.findIndex((item) => item.id === id || item.nomorSurat === id);
    if (itemIndex === -1) {
      return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    }

    const item = permohonanList[itemIndex];
    item.status = status || item.status;
    if (catatanPetugas !== undefined) item.catatanPetugas = catatanPetugas;
    if (namaPetugasPemeriksa !== undefined) item.namaPetugasPemeriksa = namaPetugasPemeriksa;
    if (penandatanganNama !== undefined) item.penandatanganNama = penandatanganNama;
    if (penandatanganPangkat !== undefined) item.penandatanganPangkat = penandatanganPangkat;
    if (penandatanganNip !== undefined) item.penandatanganNip = penandatanganNip;
    if (penandatanganTipeIdentitas !== undefined) item.penandatanganTipeIdentitas = penandatanganTipeIdentitas;
    if (penandatanganJabatan !== undefined) item.penandatanganJabatan = penandatanganJabatan;
    if (penandatanganTtdUrl !== undefined) item.penandatanganTtdUrl = penandatanganTtdUrl;
    item.updatedAt = new Date().toISOString();

    // Trigger WhatsApp notification to Pemohon on status change
    if (systemSettings.autoNotifyWa && item.noWhatsApp) {
      let statusIcon = "🟡";
      let statusDesc = `Sedang diproses oleh tim penelaah berkas Direktorat ${item.direktorat || 'Penuntutan'} JAMPIDMIL.`;
      if (item.status === "Disetujui") {
        statusIcon = "🟢";
        statusDesc = "Surat Izin Kunjungan T-10 telah TERBIT dan DISETUJUI. Silakan unduh dokumen resmi pada portal untuk dibawa saat berkunjung.";
      } else if (item.status === "Ditolak") {
        statusIcon = "🔴";
        statusDesc = `Permohonan belum dapat disetujui. Alasan/Catatan: ${item.catatanPetugas || "Persyaratan berkas belum memenuhi ketentuan."}`;
      } else if (item.status === "Selesai") {
        statusIcon = "🔵";
        statusDesc = "Kunjungan telah selesai dilaksanakan.";
      }

      const pesanPemohon =
        `🏛 *INFORMASI STATUS SURAT T-10 JAMPIDMIL (${(item.direktorat || 'Penuntutan').toUpperCase()})*\n` +
        `*Kejaksaan Agung Republik Indonesia*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Yth. Bpk/Ibu *${item.namaPemohon}*,\n\n` +
        `Permohonan Izin Kunjungan Tahanan dengan No. Registrasi:\n` +
        `📄 *${item.nomorSurat}*\n` +
        `Nama Tahanan: *${item.namaTahanan}*\n\n` +
        `Status Terbaru: ${statusIcon} *${item.status.toUpperCase()}*\n` +
        `Keterangan: ${statusDesc}\n\n` +
        `Tgl Kunjungan: *${item.tanggalKunjungan}* (${item.sesiKunjungan})\n` +
        `Lokasi: *${item.lokasiRutan}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Pesan otomatis Sistem Layanan T-10 JAMPIDMIL Kejaksaan RI_`;

      const notifyResult = await dispatchWhatsAppNotification(
        systemSettings.waGatewayProvider,
        systemSettings.waApiKey,
        item.noWhatsApp,
        pesanPemohon
      );
      if (notifyResult.success) {
        item.waNotifiedPemohon = true;
      }
    }

    const dirPermohonan = permohonanList.filter(p => p.direktorat === item.direktorat);
    syncAllToGAS("sync_permohonan", { list: dirPermohonan }, item.direktorat);

    return res.json({
      status: "success",
      message: `Status berhasil diubah menjadi ${item.status}.`,
      data: item,
    });
  });

  // 5b. Delete Permohonan (Admin & Staff)
  app.delete("/api/permohonan/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const deletedItem = permohonanList.find((item) => item.id === id || item.nomorSurat === id);

    if (!deletedItem) {
      return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    }

    permohonanList = permohonanList.filter((item) => item.id !== id && item.nomorSurat !== id);
    const dirPermohonan = permohonanList.filter(p => p.direktorat === deletedItem.direktorat);
    syncAllToGAS("sync_permohonan", { list: dirPermohonan }, deletedItem.direktorat);

    return res.json({
      status: "success",
      message: "Data permohonan kunjungan berhasil dihapus.",
    });
  });

  // 6. Settings Get & Update
  app.get("/api/settings", (_req: Request, res: Response) => {
    res.json({
      status: "success",
      data: systemSettings,
    });
  });

  app.post("/api/settings", (req: Request, res: Response) => {
    systemSettings = { ...systemSettings, ...req.body };
    res.json({
      status: "success",
      message: "Konfigurasi sistem berhasil disimpan.",
      data: systemSettings,
    });
  });

  // Force sync website baseline data to Google Spreadsheet
  app.post("/api/sync-all", async (req: Request, res: Response) => {
    try {
      const { direktorat } = req.body;
      const targetDir: Direktorat = direktorat === 'Penindakan' ? 'Penindakan' : 'Penuntutan';
      
      const filteredAkun = akunList.filter(a => a.direktorat === targetDir);
      const filteredTahanan = tahananList.filter(t => t.direktorat === targetDir);
      const filteredPermohonan = permohonanList.filter(p => p.direktorat === targetDir);

      await syncAllToGAS("sync_akun", { list: filteredAkun }, targetDir);
      await syncAllToGAS("sync_tahanan", { list: filteredTahanan }, targetDir);
      await syncAllToGAS("sync_permohonan", { list: filteredPermohonan }, targetDir);

      return res.json({
        status: "success",
        message: `Data Direktorat ${targetDir} berhasil disinkronkan ke Spreadsheet.`,
        counts: {
          akun: filteredAkun.length,
          tahanan: filteredTahanan.length,
          permohonan: filteredPermohonan.length
        }
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        message: `Gagal sinkronisasi data ke Spreadsheet: ${err.message}`
      });
    }
  });

  // ==========================================
  // MASTER DATA TAHANAN ROUTES
  // ==========================================

  app.get("/api/tahanan", async (req: Request, res: Response) => {
    await fetchAllFromGAS();
    const direktorat = req.query.direktorat as string;
    let result = [...tahananList];
    if (direktorat && direktorat !== 'Semua') {
      result = result.filter(t => t.direktorat === direktorat);
    }
    res.json({
      status: "success",
      data: result,
    });
  });

  app.post("/api/tahanan", (req: Request, res: Response) => {
    const dir: Direktorat = req.body.direktorat === 'Penindakan' ? 'Penindakan' : 'Penuntutan';
    const newTahanan: Tahanan = {
      id: `t-${Date.now()}`,
      namaLengkap: req.body.namaLengkap || req.body.namaTahanan || '',
      direktorat: dir,
      tempatLahir: req.body.tempatLahir || '',
      tanggalLahir: req.body.tanggalLahir || '',
      jenisKelamin: req.body.jenisKelamin || 'Laki-laki',
      kebangsaan: req.body.kebangsaan || 'Indonesia',
      tempatTinggal: req.body.tempatTinggal || '',
      agama: req.body.agama || '',
      pekerjaan: req.body.pekerjaan || '',
      pendidikan: req.body.pendidikan || '',
      nik: req.body.nik || '',
      tempatDitahan: req.body.tempatDitahan || req.body.lokasiRutan || '',
      namaTahanan: req.body.namaTahanan || req.body.namaLengkap,
      pangkatNrpTahanan: req.body.pangkatNrpTahanan,
      satuanTahanan: req.body.satuanTahanan,
      lokasiRutan: req.body.lokasiRutan || req.body.tempatDitahan,
    };
    tahananList.push(newTahanan);
    const dirTahanan = tahananList.filter(t => t.direktorat === dir);
    syncAllToGAS("sync_tahanan", { list: dirTahanan }, dir);
    res.status(201).json({ status: "success", data: newTahanan });
  });

  app.put("/api/tahanan/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = tahananList.findIndex((t) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    }
    tahananList[idx] = { ...tahananList[idx], ...req.body };
    const dir = tahananList[idx].direktorat || 'Penuntutan';
    const dirTahanan = tahananList.filter(t => t.direktorat === dir);
    syncAllToGAS("sync_tahanan", { list: dirTahanan }, dir);
    res.json({ status: "success", data: tahananList[idx] });
  });

  app.delete("/api/tahanan/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const target = tahananList.find(t => t.id === id);
    if (!target) return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    const dir = target.direktorat || 'Penuntutan';
    tahananList = tahananList.filter((t) => t.id !== id);
    const dirTahanan = tahananList.filter(t => t.direktorat === dir);
    syncAllToGAS("sync_tahanan", { list: dirTahanan }, dir);
    res.json({ status: "success", message: "Data dihapus." });
  });

  // ==========================================
  // AKUN / USER MANAGEMENT ROUTES
  // ==========================================

  app.get("/api/akun", async (req: Request, res: Response) => {
    await fetchAllFromGAS();
    const direktorat = req.query.direktorat as string;
    let result = [...akunList];
    if (direktorat && direktorat !== 'Semua') {
      result = result.filter(a => a.direktorat === direktorat);
    }
    res.json({ status: "success", data: result });
  });

  app.post("/api/akun", (req: Request, res: Response) => {
    const dir: Direktorat = req.body.direktorat === 'Penindakan' ? 'Penindakan' : 'Penuntutan';
    const newAkun: AkunUser = { id: `a-${Date.now()}`, direktorat: dir, ...req.body };
    akunList.push(newAkun);
    const dirAkun = akunList.filter(a => a.direktorat === dir);
    syncAllToGAS("sync_akun", { list: dirAkun }, dir);
    res.status(201).json({ status: "success", data: newAkun });
  });

  app.put("/api/akun/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const idx = akunList.findIndex((a) => a.id === id);
    if (idx === -1) return res.status(404).json({ status: "error", message: "Akun tidak ditemukan." });
    akunList[idx] = { ...akunList[idx], ...req.body };
    const dir = akunList[idx].direktorat || 'Penuntutan';
    const dirAkun = akunList.filter(a => a.direktorat === dir);
    syncAllToGAS("sync_akun", { list: dirAkun }, dir);
    res.json({ status: "success", data: akunList[idx] });
  });

  app.delete("/api/akun/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const target = akunList.find(a => a.id === id);
    if (!target) return res.status(404).json({ status: "error", message: "Akun tidak ditemukan." });
    const dir = target.direktorat || 'Penuntutan';
    akunList = akunList.filter((a) => a.id !== id);
    const dirAkun = akunList.filter(a => a.direktorat === dir);
    syncAllToGAS("sync_akun", { list: dirAkun }, dir);
    res.json({ status: "success", message: "Akun dihapus." });
  });

  // ==========================================
  // VITE MIDDLEWARE & STATIC SERVING
  // ==========================================
  const isVercelRuntime = Boolean(process.env.VERCEL);
  const isProductionBuild = process.env.NODE_ENV === "production" || isVercelRuntime;

  if (!isProductionBuild) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!isVercelRuntime) {
    app.listen(PORT, "0.0.0.0", async () => {
      console.log(`[JAMPIDMIL T-10 SERVER] Berjalan di port ${PORT}`);
      await fetchAllFromGAS();
    });
  }

  return app;
}

export default app;
void startServer();
