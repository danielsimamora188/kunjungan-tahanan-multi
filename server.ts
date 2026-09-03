import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import path from "path";
import crypto from "crypto";
import { DEFAULT_SETTINGS } from "./src/data/blueprintData";
import { PermohonanT10, SystemSettings, CreatePermohonanInput, Tahanan, AkunUser, Direktorat } from "./src/types";

const HASH_SALT = "JAMPIDMIL_T10_SECURE_AUTH_V1";

export function hashPassword(plainText: string): string {
  if (!plainText) return "";
  if (plainText.startsWith("$sha256$")) return plainText;
  const hash = crypto.createHmac("sha256", HASH_SALT).update(plainText).digest("hex");
  return `$sha256$${hash}`;
}

export function verifyPassword(inputPass: string, storedHashOrPlain: string): boolean {
  if (!inputPass || !storedHashOrPlain) return false;
  if (storedHashOrPlain.startsWith("$sha256$")) {
    return hashPassword(inputPass) === storedHashOrPlain;
  }
  return inputPass === storedHashOrPlain;
}

export function normalizePhoneNumber(phone: any): string {
  if (!phone || phone === '-' || phone === 'undefined' || phone === 'null') return '';
  let str = String(phone).trim().replace(/^'/, '');
  if (!str) return '';
  if (str.startsWith('+62')) {
    str = '0' + str.substring(3);
  } else if (str.startsWith('62')) {
    str = '0' + str.substring(2);
  } else if (str.startsWith('8')) {
    str = '0' + str;
  }
  return str;
}

export const app = express();
app.use(express.json({ limit: "50mb" }));

// Dynamic URL recovery and auto-initialization middleware for Vercel Serverless
app.use(async (req, res, next) => {
  try {
    const forwardedUri = (req.headers['x-forwarded-uri'] as string) || 
                         (req.headers['x-matched-path'] as string) ||
                         (req.headers['x-vercel-matched-path'] as string);
    if (forwardedUri && typeof forwardedUri === 'string' && !forwardedUri.includes('/api/index.')) {
      req.url = forwardedUri;
    } else if (req.url && (req.url.startsWith('/api/index.js') || req.url.startsWith('/api/index'))) {
      const parsedUrl = new URL(req.url, 'http://localhost');
      const subpath = parsedUrl.searchParams.get('__subpath');
      if (subpath) {
        parsedUrl.searchParams.delete('__subpath');
        const query = parsedUrl.searchParams.toString();
        req.url = `/api/${subpath}${query ? '?' + query : ''}`;
      } else {
        req.url = '/api';
      }
    }
    await initApp();
    next();
  } catch (err) {
    console.error('Middleware init error:', err);
    next();
  }
});


// In-Memory persistent store for server session (Strictly populated from Google Spreadsheet)
let permohonanList: PermohonanT10[] = [];
let tahananList: Tahanan[] = [];
let akunList: AkunUser[] = [];

function cleanEnvUrl(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^['"]|['"]$/g, "");
}

const defaultGasUrl = cleanEnvUrl(process.env.GAS_WEBHOOK_URL) || DEFAULT_SETTINGS.googleAppsScriptUrl;
const defaultGasUrlPenindakan = cleanEnvUrl(process.env.GAS_WEBHOOK_URL_PENINDAKAN) || (DEFAULT_SETTINGS.googleAppsScriptUrlPenindakan || "");
let systemSettings: SystemSettings = {
  ...DEFAULT_SETTINGS,
  googleAppsScriptUrl: defaultGasUrl,
  googleAppsScriptUrlPenindakan: defaultGasUrlPenindakan,
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1_98HePK55aFpwm9eNpeMBjQZU8nH1wg0bN7m7U-tiV4/edit?usp=sharing",
  googleDocTemplateUrl: "https://docs.google.com/document/d/1EvD3bMe-K_6-RliZa6kdbed6Ef_IRdlb/edit?usp=sharing&ouid=109982999574552257586&rtpof=true&sd=true",
};

let isInitialized = false;
export async function initApp() {
  if (process.env.GAS_WEBHOOK_URL) {
    systemSettings.googleAppsScriptUrl = cleanEnvUrl(process.env.GAS_WEBHOOK_URL);
  }
  if (process.env.GAS_WEBHOOK_URL_PENINDAKAN) {
    systemSettings.googleAppsScriptUrlPenindakan = cleanEnvUrl(process.env.GAS_WEBHOOK_URL_PENINDAKAN);
  }
  if (!isInitialized) {
    isInitialized = true;
    await fetchAllFromGAS();
  }
}

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
const CACHE_TTL_MS = 3000;

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

      const newPermohonanList: PermohonanT10[] = [];
      const newTahananList: Tahanan[] = [];
      const newAkunList: AkunUser[] = [];

      for (const { url, dir } of urls) {
        try {
          let json: any = null;
          try {
            const resp = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "get_all" }),
              redirect: "follow",
            });
            if (resp.ok) {
              json = await resp.json();
            }
          } catch (postErr) {
            console.warn(`POST fetch error for ${dir}, attempting GET:`, postErr);
          }

          if (!json || json.status !== "success") {
            try {
              const respGet = await fetch(url, { method: "GET", redirect: "follow" });
              if (respGet.ok) {
                json = await respGet.json();
              }
            } catch (getErr) {
              console.warn(`GET fetch error for ${dir}:`, getErr);
            }
          }
          lastFetchTime = Date.now();
          if (json.status === "success") {
            if (Array.isArray(json.permohonan)) {
              json.permohonan.forEach((p: any, idx: number) => {
                const uniqueId = p.id ? `${dir === 'Penindakan' ? 'pnd' : 'pnt'}-${p.id}` : `p-${dir === 'Penindakan' ? 'pnd' : 'pnt'}-${idx}-${Date.now()}`;
                newPermohonanList.push({
                  ...p,
                  id: uniqueId,
                  noWhatsApp: normalizePhoneNumber(p.noWhatsApp),
                  direktorat: dir, // 100% strict by Webhook URL source
                  status: p.status || 'Diproses',
                  penandatanganNama: (p.penandatanganNama && p.penandatanganNama !== '-') ? p.penandatanganNama : '',
                  penandatanganPangkat: (p.penandatanganPangkat && p.penandatanganPangkat !== '-') ? p.penandatanganPangkat : '',
                  penandatanganNip: (p.penandatanganNip && p.penandatanganNip !== '-') ? p.penandatanganNip : '',
                  penandatanganTipeIdentitas: (p.penandatanganTipeIdentitas && p.penandatanganTipeIdentitas !== '-') ? p.penandatanganTipeIdentitas : 'NIP',
                  penandatanganJabatan: (p.penandatanganJabatan && p.penandatanganJabatan !== '-') ? p.penandatanganJabatan : '',
                  penandatanganTtdUrl: (p.penandatanganTtdUrl && p.penandatanganTtdUrl !== '-') ? p.penandatanganTtdUrl : '',
                });
              });
            }
            if (Array.isArray(json.tahanan)) {
              json.tahanan.forEach((t: any, idx: number) => {
                const uniqueId = t.id ? `${dir === 'Penindakan' ? 'tnd' : 'tnt'}-${t.id}` : `t-${dir === 'Penindakan' ? 'tnd' : 'tnt'}-${idx}-${Date.now()}`;
                newTahananList.push({
                  id: uniqueId,
                  namaLengkap: t.namaLengkap || t.namaTahanan || '',
                  namaTahanan: t.namaTahanan || t.namaLengkap || '',
                  // STRICT: Always bound to the Webhook URL's direktorat
                  direktorat: dir,
                  pangkatNrpTahanan: (t.pangkatNrpTahanan && t.pangkatNrpTahanan !== '-') ? t.pangkatNrpTahanan : (t.pangkat || '-'),
                  satuanTahanan: (t.satuanTahanan && t.satuanTahanan !== '-') ? t.satuanTahanan : (t.satuan || '-'),
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
                });
              });
            }
            if (Array.isArray(json.akun) && json.akun.length > 0) {
              json.akun.forEach((a: any, idx: number) => {
                const uniqueId = a.id ? `${dir === 'Penindakan' ? 'und' : 'unt'}-${a.id}` : `u-${dir === 'Penindakan' ? 'und' : 'unt'}-${idx}-${Date.now()}`;
                let tipeId: 'NIP' | 'NRP' = (a.tipeIdentitas === 'NRP' || a.tipeIdentitas === 'NIP') ? a.tipeIdentitas : 'NIP';
                let pangkat = a.pangkat;
                let jabatan = a.jabatan;
                let role = a.role;

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

                let passwordHash = a.password || '';
                if (passwordHash && !passwordHash.startsWith('$sha256$')) {
                  passwordHash = hashPassword(passwordHash);
                }

                newAkunList.push({
                  id: uniqueId,
                  nama: (a.nama && a.nama !== '-') ? a.nama : 'Pengguna',
                  nip: (a.nip && a.nip !== '-') ? a.nip : '',
                  tipeIdentitas: tipeId,
                  pangkat: (pangkat && pangkat !== '-') ? pangkat : '',
                  jabatan: (jabatan && jabatan !== '-') ? jabatan : '',
                  role: role,
                  // STRICT: All accounts from this webhook URL are exclusively bound to this direktorat
                  direktorat: dir,
                  username: a.username || '',
                  password: passwordHash,
                  email: (a.email && a.email !== '-') ? a.email : '',
                  noHp: normalizePhoneNumber(a.noHp),
                  eSignEnabled: !!a.eSignEnabled,
                  fotoTandaTangan: (a.fotoTandaTangan && a.fotoTandaTangan !== '-') ? a.fotoTandaTangan : ''
                });
              });
            }
          }
        } catch (e) {
          console.warn(`Fetch error for ${dir}:`, e);
        }
      }

      permohonanList = newPermohonanList;
      tahananList = newTahananList;
      akunList = newAkunList;
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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ==========================================
// API ROUTES
// ==========================================

// 0. Admin & Staff Login Endpoint
app.post("/api/login", async (req: Request, res: Response) => {
  await initApp();
  const { username, password } = req.body || {};
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
      const storedPass = String(matchedAccount.password || "").trim();
      if (storedPass && !verifyPassword(cleanPass, storedPass)) {
        return res.status(401).json({ status: "error", message: "Password yang Anda masukkan salah." });
      }

      // Upgrade legacy password to hash if needed
      if (storedPass && !storedPass.startsWith("$sha256$")) {
        matchedAccount.password = hashPassword(storedPass);
      }

      const safeUser = { ...matchedAccount };
      delete (safeUser as any).password;

      return res.json({
        status: "success",
        token: `token-${matchedAccount.id}-${Date.now()}`,
        user: safeUser,
      });
    }

    return res.status(401).json({ status: "error", message: "Username, NIP, atau password salah." });
  });

  // Helper to extract authenticated user context from request headers or queries
  function getUserContext(req: Request): { role?: string; direktorat?: Direktorat; nip?: string } {
    const role = (req.headers["x-user-role"] as string) || (req.query.userRole as string) || "";
    const direktorat = (req.headers["x-user-direktorat"] as Direktorat) || (req.query.userDirektorat as Direktorat) || undefined;
    const nip = (req.headers["x-user-nip"] as string) || (req.query.userNip as string) || "";
    return { role, direktorat, nip };
  }

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
    const userContext = getUserContext(req);
    const q = (req.query.q as string || "").toLowerCase();
    const status = req.query.status as string;
    const targetDir = (req.query.direktorat as string) || userContext.direktorat;

    let filtered = [...permohonanList];

    if (targetDir && targetDir !== "Semua") {
      filtered = filtered.filter((item) => (item.direktorat || 'Penuntutan') === targetDir);
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

  // 2.5 Get Admin WA Number Endpoint
  app.get("/api/admin-wa", async (req: Request, res: Response) => {
    await fetchAllFromGAS();
    const dir = (req.query.direktorat as Direktorat) || 'Penuntutan';
    
    // 1. Strict priority: Role Admin with valid noHp
    let adminAcc = akunList.find(a => 
      (a.direktorat || 'Penuntutan') === dir && 
      a.role === 'Admin' && 
      a.noHp && a.noHp.trim().length >= 9
    );

    // 2. Fallback: Role Staff with valid noHp
    if (!adminAcc) {
      adminAcc = akunList.find(a => 
        (a.direktorat || 'Penuntutan') === dir && 
        a.role === 'Staff' && 
        a.noHp && a.noHp.trim().length >= 9
      );
    }

    // 3. Fallback: Any account in directorate with valid noHp
    if (!adminAcc) {
      adminAcc = akunList.find(a => 
        (a.direktorat || 'Penuntutan') === dir && 
        a.noHp && a.noHp.trim().length >= 9
      );
    }

    let phone = adminAcc?.noHp || (dir === 'Penindakan' ? '081299887766' : '081398765432');
    phone = normalizePhoneNumber(phone);
    res.json({ status: "success", direktorat: dir, waNumber: phone, adminNama: adminAcc?.nama || 'Admin' });
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
        `👤 *Pemohon:* ${newPermohonan.namaPemohon} (${newPermohonan.hubungan})\n` +
        `🎖 *Tahanan:* ${newPermohonan.namaTahanan} (${newPermohonan.pangkatNrpTahanan})\n` +
        `📍 *Lokasi:* ${newPermohonan.lokasiRutan}\n` +
        `📅 *Tgl Kunjungan:* ${newPermohonan.tanggalKunjungan} (${newPermohonan.sesiKunjungan})\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `_Mohon Administrator / Pejabat Penelaah ${targetDirektorat} segera memeriksa permohonan ini._`;

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

  // 5. Update Status Permohonan & Disposisi / E-Sign (RBAC & Directorate Protected)
  app.patch("/api/permohonan/:id/status", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userContext = getUserContext(req);
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

    let itemIndex = permohonanList.findIndex(
      (item) =>
        (item.id === id || item.nomorSurat === id) &&
        (!userContext.direktorat || (userContext.direktorat as string) === 'Semua' || item.direktorat === userContext.direktorat)
    );
    if (itemIndex === -1) {
      itemIndex = permohonanList.findIndex((item) => item.id === id || item.nomorSurat === id);
    }
    if (itemIndex === -1) {
      return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    }

    const item = permohonanList[itemIndex];

    // Directorate Boundary Enforcement
    if (userContext.direktorat && userContext.direktorat !== item.direktorat) {
      return res.status(403).json({
        status: "error",
        message: `Akses Ditolak: Anda (${userContext.role} ${userContext.direktorat}) tidak memiliki wewenang untuk memproses permohonan Direktorat ${item.direktorat}.`,
      });
    }

    // Role Specific Boundary Enforcement
    if (userContext.role === "Penuntut Umum Koneksitas" && item.direktorat !== "Penuntutan") {
      return res.status(403).json({
        status: "error",
        message: "Akses Ditolak: Penuntut Umum Koneksitas hanya berwenang memeriksa dan menandatangani permohonan Direktorat Penuntutan.",
      });
    }

    if (userContext.role === "Penyidik Koneksitas" && item.direktorat !== "Penindakan") {
      return res.status(403).json({
        status: "error",
        message: "Akses Ditolak: Penyidik Koneksitas hanya berwenang memeriksa dan menandatangani permohonan Direktorat Penindakan.",
      });
    }

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
    // Reset cache so next GET re-fetches from GAS (which now has the updated status)
    lastFetchTime = 0;

    return res.json({
      status: "success",
      message: `Status berhasil diubah menjadi ${item.status}.`,
      data: item,
    });
  });

  // 5b. Delete Permohonan (Admin Only per Directorate)
  app.delete("/api/permohonan/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userContext = getUserContext(req);
    let itemIndex = permohonanList.findIndex(
      (item) =>
        (item.id === id || item.nomorSurat === id) &&
        (!userContext.direktorat || (userContext.direktorat as string) === 'Semua' || item.direktorat === userContext.direktorat)
    );
    if (itemIndex === -1) {
      itemIndex = permohonanList.findIndex((item) => item.id === id || item.nomorSurat === id);
    }
    if (itemIndex === -1) {
      return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    }
    const deletedItem = permohonanList[itemIndex];

    if (userContext.role && userContext.role !== "Admin") {
      return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator yang berwenang menghapus permohonan." });
    }

    if (userContext.direktorat && userContext.direktorat !== deletedItem.direktorat) {
      return res.status(403).json({
        status: "error",
        message: `Akses Ditolak: Anda tidak memiliki wewenang untuk menghapus data Direktorat ${deletedItem.direktorat}.`,
      });
    }

    permohonanList = permohonanList.filter((item) => item.id !== id && item.nomorSurat !== id);
    const dirPermohonan = permohonanList.filter(p => p.direktorat === deletedItem.direktorat);
    syncAllToGAS("sync_permohonan", { list: dirPermohonan }, deletedItem.direktorat);

    return res.json({
      status: "success",
      message: "Data permohonan kunjungan berhasil dihapus.",
    });
  });

  // 6. Settings Get & Update (Admin Only per Directorate)
  app.get("/api/settings", (_req: Request, res: Response) => {
    res.json({
      status: "success",
      data: systemSettings,
    });
  });

  app.post("/api/settings", (req: Request, res: Response) => {
    const userContext = getUserContext(req);
    if (userContext.role && userContext.role !== "Admin") {
      return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator yang berwenang mengubah pengaturan sistem." });
    }

    systemSettings = { ...systemSettings, ...req.body };
    res.json({
      status: "success",
      message: "Konfigurasi sistem berhasil disimpan.",
      data: systemSettings,
    });
  });

  // Test Webhook GAS
  app.post("/api/test-gas", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ status: "error", message: "URL Webhook wajib diisi." });
      }
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_all" }),
      });
      const data = await resp.json();
      return res.json({
        status: "success",
        message: "Koneksi Webhook Google Apps Script berhasil terhubung!",
        data,
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        message: `Gagal menghubungi Google Apps Script: ${err.message || String(err)}`,
      });
    }
  });

  // Test WhatsApp Gateway
  app.post("/api/test-wa", async (req: Request, res: Response) => {
    try {
      const { provider, apiKey, targetPhone } = req.body;
      const testMsg = "Tes koneksi WhatsApp Gateway JAMPIDMIL Berhasil.";
      const result = await dispatchWhatsAppNotification(provider, apiKey, targetPhone, testMsg);
      if (result.success) {
        return res.json({ status: "success", message: result.detail || "WhatsApp terkirim." });
      } else {
        return res.status(500).json({ status: "error", message: result.detail || "Gagal kirim pesan." });
      }
    } catch (err: any) {
      return res.status(500).json({ status: "error", message: err.message || "Gagal tes WhatsApp." });
    }
  });

  // Force sync website baseline data to Google Spreadsheet
  app.post("/api/sync-all", async (req: Request, res: Response) => {
    try {
      const userContext = getUserContext(req);
      const targetDir: Direktorat = (userContext.direktorat) 
        ? userContext.direktorat 
        : (req.body.direktorat === 'Penindakan' ? 'Penindakan' : 'Penuntutan');
      
      if (userContext.direktorat && req.body.direktorat && userContext.direktorat !== req.body.direktorat) {
        return res.status(403).json({
          status: "error",
          message: `Akses Ditolak: Anda hanya berwenang menyinkronkan data Direktorat ${userContext.direktorat}.`,
        });
      }

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
  // MASTER DATA TAHANAN ROUTES (RBAC & BOUNDARY PROTECTED)
  // ==========================================

  app.get("/api/tahanan", async (req: Request, res: Response) => {
    await fetchAllFromGAS();
    const userContext = getUserContext(req);
    const targetDir = (req.query.direktorat as string) || userContext.direktorat;
    let result = [...tahananList];
    if (targetDir && targetDir !== 'Semua') {
      result = result.filter(t => (t.direktorat || 'Penuntutan') === targetDir);
    }
    res.json({
      status: "success",
      data: result,
    });
  });

  app.post("/api/tahanan", async (req: Request, res: Response) => {
    const userContext = getUserContext(req);
    if (userContext.role === "Penuntut Umum Koneksitas" || userContext.role === "Penyidik Koneksitas") {
      return res.status(403).json({
        status: "error",
        message: "Akses Ditolak: Pejabat Penandatangan memiliki akses Read-Only untuk Master Tahanan.",
      });
    }

    const dir: Direktorat = (req.body.direktorat === 'Penindakan') 
      ? 'Penindakan' 
      : ((req.body.direktorat === 'Penuntutan') ? 'Penuntutan' : (userContext.direktorat || 'Penuntutan'));

    const newTahanan: Tahanan = {
      id: req.body.id || `t-${Date.now()}`,
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
      pangkatNrpTahanan: req.body.pangkatNrpTahanan || '-',
      satuanTahanan: req.body.satuanTahanan || '-',
      lokasiRutan: req.body.lokasiRutan || req.body.tempatDitahan || '',
    };
    tahananList.push(newTahanan);
    const dirTahanan = tahananList.filter(t => t.direktorat === dir);
    await syncAllToGAS("sync_tahanan", { list: dirTahanan }, dir);
    lastFetchTime = 0;
    res.status(201).json({ status: "success", data: newTahanan });
  });

  app.put("/api/tahanan/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userContext = getUserContext(req);
    if (userContext.role === "Penuntut Umum Koneksitas" || userContext.role === "Penyidik Koneksitas") {
      return res.status(403).json({
        status: "error",
        message: "Akses Ditolak: Pejabat Penandatangan memiliki akses Read-Only untuk Master Tahanan.",
      });
    }

    const idx = tahananList.findIndex((t) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
    }

    const prevDir = tahananList[idx].direktorat || userContext.direktorat || 'Penuntutan';
    const newDir: Direktorat = req.body.direktorat || userContext.direktorat || prevDir;

    tahananList[idx] = { ...tahananList[idx], ...req.body, direktorat: newDir };
    
    // Sync both previous dir and new dir if changed
    const dirTahananNew = tahananList.filter(t => t.direktorat === newDir);
    await syncAllToGAS("sync_tahanan", { list: dirTahananNew }, newDir);

    if (prevDir !== newDir) {
      const dirTahananPrev = tahananList.filter(t => t.direktorat === prevDir);
      await syncAllToGAS("sync_tahanan", { list: dirTahananPrev }, prevDir);
    }

    lastFetchTime = 0;
    res.json({ status: "success", data: tahananList[idx] });
  });

  app.delete("/api/tahanan/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userContext = getUserContext(req);
    if (userContext.role && userContext.role !== "Admin" && userContext.role !== "Staff") {
      return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator dan Staff yang berwenang menghapus data tahanan." });
    }

    const target = tahananList.find(t => t.id === id);
    if (!target) return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });

    if (userContext.direktorat && (target.direktorat || 'Penuntutan') !== userContext.direktorat) {
      return res.status(403).json({
        status: "error",
        message: `Akses Ditolak: Anda hanya berwenang menghapus tahanan Direktorat ${userContext.direktorat}.`,
      });
    }

    const dir = target.direktorat || userContext.direktorat || 'Penuntutan';
    tahananList = tahananList.filter((t) => t.id !== id);
    const dirTahanan = tahananList.filter(t => t.direktorat === dir);
    await syncAllToGAS("sync_tahanan", { list: dirTahanan }, dir);
    lastFetchTime = 0;
    res.json({ status: "success", message: "Data dihapus." });
  });

  // ==========================================
  // AKUN / USER MANAGEMENT ROUTES (ADMIN & DIRECTORATE PROTECTED)
  // ==========================================

  app.get("/api/akun", async (req: Request, res: Response) => {
    await fetchAllFromGAS();
    const userContext = getUserContext(req);
    const targetDir = (req.query.direktorat as string) || userContext.direktorat;
    let result = akunList.map(a => {
      const safe = { ...a };
      safe.password = safe.password ? "••••••••" : "";
      return safe;
    });
    if (targetDir && targetDir !== 'Semua') {
      result = result.filter(a => (a.direktorat || 'Penuntutan') === targetDir);
    }
    res.json({ status: "success", data: result });
  });

  app.post("/api/akun", async (req: Request, res: Response) => {
    const userContext = getUserContext(req);
    if (userContext.role && userContext.role !== "Admin") {
      return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator yang berwenang membuat akun." });
    }

    const dir: Direktorat = req.body.direktorat || userContext.direktorat || 'Penuntutan';
    if (userContext.direktorat && req.body.direktorat && userContext.direktorat !== req.body.direktorat) {
      return res.status(403).json({
        status: "error",
        message: `Akses Ditolak: Anda hanya berwenang membuat akun untuk Direktorat ${userContext.direktorat}.`,
      });
    }

    const rawPassword = req.body.password || "123456";
    const hashedPassword = hashPassword(rawPassword);

    const newAkun: AkunUser = {
      id: `a-${Date.now()}`,
      direktorat: dir,
      ...req.body,
      noHp: normalizePhoneNumber(req.body.noHp),
      password: hashedPassword
    };

    akunList.push(newAkun);
    const dirAkun = akunList.filter(a => a.direktorat === dir);
    await syncAllToGAS("sync_akun", { list: dirAkun }, dir);
    lastFetchTime = 0;

    const safeResp = { ...newAkun };
    safeResp.password = "••••••••";
    res.status(201).json({ status: "success", data: safeResp });
  });

  app.put("/api/akun/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userContext = getUserContext(req);

    // Find by exact ID first, then fall back to matching by NIP (handles GAS refresh ID shifts)
    let idx = akunList.findIndex((a) => a.id === id);
    if (idx === -1 && userContext.nip) {
      // Self-edit: find by NIP
      idx = akunList.findIndex((a) => a.nip === userContext.nip);
    }
    if (idx === -1) {
      // Last resort: find by username from request body
      const bodyUsername = req.body?.username;
      if (bodyUsername) {
        idx = akunList.findIndex((a) => a.username === bodyUsername);
      }
    }
    if (idx === -1) return res.status(404).json({ status: "error", message: "Akun tidak ditemukan." });

    // Allow user to edit their own profile OR Admin editing accounts in their directorate
    const isSelf = userContext.nip && userContext.nip === akunList[idx].nip;
    const isAdmin = userContext.role === "Admin";

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ status: "error", message: "Akses Ditolak: Anda tidak berwenang mengubah akun ini." });
    }

    if (isAdmin && !isSelf && userContext.direktorat && (akunList[idx].direktorat || 'Penuntutan') !== userContext.direktorat) {
      return res.status(403).json({
        status: "error",
        message: `Akses Ditolak: Anda hanya berwenang mengelola akun Direktorat ${userContext.direktorat}.`,
      });
    }

    const prevDir = akunList[idx].direktorat || userContext.direktorat || 'Penuntutan';
    const newDir: Direktorat = req.body.direktorat || userContext.direktorat || prevDir;

    const updateData = { ...req.body };
    if (updateData.noHp !== undefined) {
      updateData.noHp = normalizePhoneNumber(updateData.noHp);
    }
    if (updateData.password && updateData.password !== "••••••••") {
      updateData.password = hashPassword(updateData.password);
    } else {
      delete updateData.password;
    }

    akunList[idx] = { ...akunList[idx], ...updateData, direktorat: newDir };
    const dirAkunNew = akunList.filter(a => a.direktorat === newDir);
    await syncAllToGAS("sync_akun", { list: dirAkunNew }, newDir);

    if (prevDir !== newDir) {
      const dirAkunPrev = akunList.filter(a => a.direktorat === prevDir);
      await syncAllToGAS("sync_akun", { list: dirAkunPrev }, prevDir);
    }

    lastFetchTime = 0;
    const safeResp = { ...akunList[idx] };
    safeResp.password = "••••••••";
    res.json({ status: "success", data: safeResp });
  });

  app.delete("/api/akun/:id", async (req: Request, res: Response) => {
    const { id } = req.params;
    const userContext = getUserContext(req);
    if (userContext.role && userContext.role !== "Admin") {
      return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator yang berwenang menghapus akun." });
    }

    const target = akunList.find(a => a.id === id);
    if (!target) return res.status(404).json({ status: "error", message: "Akun tidak ditemukan." });

    if (userContext.direktorat && (target.direktorat || 'Penuntutan') !== userContext.direktorat) {
      return res.status(403).json({
        status: "error",
        message: `Akses Ditolak: Anda hanya berwenang menghapus akun Direktorat ${userContext.direktorat}.`,
      });
    }

    const dir = target.direktorat || userContext.direktorat || 'Penuntutan';
    akunList = akunList.filter((a) => a.id !== id);
    const dirAkun = akunList.filter(a => a.direktorat === dir);
    await syncAllToGAS("sync_akun", { list: dirAkun }, dir);
    lastFetchTime = 0;
    res.json({ status: "success", message: "Akun dihapus." });
  });

  // ==========================================
  // VITE MIDDLEWARE & STATIC SERVING
  // ==========================================
  async function startServer() {
    const isVercelRuntime = Boolean(process.env.VERCEL);
    const isProductionBuild = process.env.NODE_ENV === "production" || isVercelRuntime;

    if (!isProductionBuild) {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else if (!isVercelRuntime) {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    if (!isVercelRuntime) {
      app.listen(PORT, "0.0.0.0", async () => {
        console.log(`[JAMPIDMIL T-10 SERVER] Berjalan di port ${PORT}`);
        await initApp();
      });
    }
  }

export default app;

const isServerlessEnv = Boolean(
  process.env.VERCEL || 
  process.env.VERCEL_ENV || 
  process.env.NOW_REGION || 
  process.env.AWS_LAMBDA_FUNCTION_NAME
);

if (!isServerlessEnv) {
  void startServer();
}


