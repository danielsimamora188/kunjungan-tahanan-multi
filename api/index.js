// server.ts
import dotenv from "dotenv";
import express from "express";
import path from "path";
import crypto from "crypto";

// src/data/blueprintData.ts
var DEFAULT_SETTINGS = {
  // Spreadsheet & Webhook Penuntutan
  googleAppsScriptUrl: "https://script.google.com/macros/s/AKfycbxeCW1GRRFN3J96JvOQquK0F5CijcTAs6fjQfHtItofVfBp4IS8Su9T7WRWhYyDqLdnFQ/exec",
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1_98HePK55aFpwm9eNpeMBjQZU8nH1wg0bN7m7U-tiV4/edit?usp=sharing",
  // Spreadsheet & Webhook Penindakan (Terpisah)
  googleAppsScriptUrlPenindakan: "https://script.google.com/macros/s/AKfycbzulziFF4UIwA3wYEqVhYAomOSDOoZh6GRjFfK693hirRIb7mmPPypYj7nGjP4hvS5t/exec",
  spreadsheetUrlPenindakan: "https://docs.google.com/spreadsheets/d/penindakan-spreadsheet-id/edit?usp=sharing",
  googleDocTemplateUrl: "https://docs.google.com/document/d/1EvD3bMe-K_6-RliZa6kdbed6Ef_IRdlb/edit?usp=sharing&ouid=109982999574552257586&rtpof=true&sd=true",
  waGatewayProvider: "simulasi",
  waApiKey: "",
  waAdminPhone: "",
  autoSyncSheets: true,
  autoNotifyWa: true,
  pejabatNama: "",
  pejabatPangkat: "",
  pejabatNip: "",
  pejabatJabatan: ""
};

// server.ts
dotenv.config();
var HASH_SALT = "JAMPIDMIL_T10_SECURE_AUTH_V1";
function hashPassword(plainText) {
  if (!plainText) return "";
  if (plainText.startsWith("$sha256$")) return plainText;
  const hash = crypto.createHmac("sha256", HASH_SALT).update(plainText).digest("hex");
  return `$sha256$${hash}`;
}
function verifyPassword(inputPass, storedHashOrPlain) {
  if (!inputPass || !storedHashOrPlain) return false;
  if (storedHashOrPlain.startsWith("$sha256$")) {
    return hashPassword(inputPass) === storedHashOrPlain;
  }
  return inputPass === storedHashOrPlain;
}
function normalizePhoneNumber(phone) {
  if (!phone || phone === "-" || phone === "undefined" || phone === "null") return "";
  let str = String(phone).trim().replace(/^'/, "");
  if (!str) return "";
  if (str.startsWith("+62")) {
    str = "0" + str.substring(3);
  } else if (str.startsWith("62")) {
    str = "0" + str.substring(2);
  } else if (str.startsWith("8")) {
    str = "0" + str;
  }
  return str;
}
var app = express();
app.use(express.json({ limit: "50mb" }));
app.use(async (req, res, next) => {
  try {
    const forwardedUri = req.headers["x-forwarded-uri"] || req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
    if (forwardedUri && typeof forwardedUri === "string" && !forwardedUri.includes("/api/index.")) {
      req.url = forwardedUri;
    } else if (req.url && (req.url.startsWith("/api/index.js") || req.url.startsWith("/api/index"))) {
      const parsedUrl = new URL(req.url, "http://localhost");
      const subpath = parsedUrl.searchParams.get("__subpath");
      if (subpath) {
        parsedUrl.searchParams.delete("__subpath");
        const query = parsedUrl.searchParams.toString();
        req.url = `/api/${subpath}${query ? "?" + query : ""}`;
      } else {
        req.url = "/api";
      }
    }
    await initApp();
    next();
  } catch (err) {
    console.error("Middleware init error:", err);
    next();
  }
});
var permohonanList = [];
var tahananList = [];
var akunList = [];
function cleanEnvUrl(val) {
  if (!val) return "";
  return val.trim().replace(/^['"]|['"]$/g, "");
}
var defaultGasUrl = cleanEnvUrl(process.env.GAS_WEBHOOK_URL) || DEFAULT_SETTINGS.googleAppsScriptUrl;
var defaultGasUrlPenindakan = cleanEnvUrl(process.env.GAS_WEBHOOK_URL_PENINDAKAN) || (DEFAULT_SETTINGS.googleAppsScriptUrlPenindakan || "");
var systemSettings = {
  ...DEFAULT_SETTINGS,
  googleAppsScriptUrl: defaultGasUrl,
  googleAppsScriptUrlPenindakan: defaultGasUrlPenindakan,
  spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1_98HePK55aFpwm9eNpeMBjQZU8nH1wg0bN7m7U-tiV4/edit?usp=sharing",
  googleDocTemplateUrl: "https://docs.google.com/document/d/1EvD3bMe-K_6-RliZa6kdbed6Ef_IRdlb/edit?usp=sharing&ouid=109982999574552257586&rtpof=true&sd=true"
};
var isInitialized = false;
async function initApp() {
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
function generateNextT10Number(direktorat = "Penuntutan") {
  const dirList = permohonanList.filter((p) => (p.direktorat || "Penuntutan") === direktorat);
  const usedNumbers = /* @__PURE__ */ new Set();
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
  const now = /* @__PURE__ */ new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const kodeDir = direktorat === "Penindakan" ? "PMpd.1" : "PMpt.1";
  const nomorSurat = `B-${nextNum}/PM.3/${kodeDir}/${month}/${year}`;
  return { nomorSurat, nomorUrut: nextNum };
}
async function syncAllToGAS(action, payload, direktorat) {
  const targetUrl = direktorat === "Penindakan" && systemSettings.googleAppsScriptUrlPenindakan ? systemSettings.googleAppsScriptUrlPenindakan : systemSettings.googleAppsScriptUrl;
  if (!targetUrl) return;
  try {
    await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, direktorat, ...payload })
    });
  } catch (err) {
    console.warn("GAS sync error (non-fatal):", err);
  }
}
var lastFetchTime = 0;
var gasFetchPromise = null;
var CACHE_TTL_MS = 3e3;
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
      const urls = [];
      if (systemSettings.googleAppsScriptUrl) {
        urls.push({ url: systemSettings.googleAppsScriptUrl, dir: "Penuntutan" });
      }
      if (systemSettings.googleAppsScriptUrlPenindakan && systemSettings.googleAppsScriptUrlPenindakan !== systemSettings.googleAppsScriptUrl) {
        urls.push({ url: systemSettings.googleAppsScriptUrlPenindakan, dir: "Penindakan" });
      }
      const newPermohonanList = [];
      const newTahananList = [];
      const newAkunList = [];
      for (const { url, dir } of urls) {
        try {
          let json = null;
          try {
            const resp = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "get_all" }),
              redirect: "follow"
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
              json.permohonan.forEach((p, idx) => {
                const uniqueId = p.id ? `${dir === "Penindakan" ? "pnd" : "pnt"}-${p.id}` : `p-${dir === "Penindakan" ? "pnd" : "pnt"}-${idx}-${Date.now()}`;
                newPermohonanList.push({
                  ...p,
                  id: uniqueId,
                  noWhatsApp: normalizePhoneNumber(p.noWhatsApp),
                  direktorat: dir,
                  // 100% strict by Webhook URL source
                  status: p.status || "Diproses",
                  penandatanganNama: p.penandatanganNama && p.penandatanganNama !== "-" ? p.penandatanganNama : "",
                  penandatanganPangkat: p.penandatanganPangkat && p.penandatanganPangkat !== "-" ? p.penandatanganPangkat : "",
                  penandatanganNip: p.penandatanganNip && p.penandatanganNip !== "-" ? p.penandatanganNip : "",
                  penandatanganTipeIdentitas: p.penandatanganTipeIdentitas && p.penandatanganTipeIdentitas !== "-" ? p.penandatanganTipeIdentitas : "NIP",
                  penandatanganJabatan: p.penandatanganJabatan && p.penandatanganJabatan !== "-" ? p.penandatanganJabatan : "",
                  penandatanganTtdUrl: p.penandatanganTtdUrl && p.penandatanganTtdUrl !== "-" ? p.penandatanganTtdUrl : ""
                });
              });
            }
            if (Array.isArray(json.tahanan)) {
              json.tahanan.forEach((t, idx) => {
                const uniqueId = t.id ? `${dir === "Penindakan" ? "tnd" : "tnt"}-${t.id}` : `t-${dir === "Penindakan" ? "tnd" : "tnt"}-${idx}-${Date.now()}`;
                newTahananList.push({
                  id: uniqueId,
                  namaLengkap: t.namaLengkap || t.namaTahanan || "",
                  namaTahanan: t.namaTahanan || t.namaLengkap || "",
                  // STRICT: Always bound to the Webhook URL's direktorat
                  direktorat: dir,
                  pangkatNrpTahanan: t.pangkatNrpTahanan && t.pangkatNrpTahanan !== "-" ? t.pangkatNrpTahanan : t.pangkat || "-",
                  satuanTahanan: t.satuanTahanan && t.satuanTahanan !== "-" ? t.satuanTahanan : t.satuan || "-",
                  tempatLahir: t.tempatLahir || "",
                  tanggalLahir: t.tanggalLahir || "",
                  jenisKelamin: t.jenisKelamin || "Laki-laki",
                  kebangsaan: t.kebangsaan || "Indonesia",
                  tempatTinggal: t.tempatTinggal || "",
                  agama: t.agama || "",
                  pekerjaan: t.pekerjaan || "",
                  pendidikan: t.pendidikan || "",
                  nik: t.nik || "",
                  tempatDitahan: t.tempatDitahan || t.lokasiRutan || "",
                  lokasiRutan: t.lokasiRutan || t.tempatDitahan || ""
                });
              });
            }
            if (Array.isArray(json.akun) && json.akun.length > 0) {
              json.akun.forEach((a, idx) => {
                const uniqueId = a.id ? `${dir === "Penindakan" ? "und" : "unt"}-${a.id}` : `u-${dir === "Penindakan" ? "und" : "unt"}-${idx}-${Date.now()}`;
                let tipeId = a.tipeIdentitas === "NRP" || a.tipeIdentitas === "NIP" ? a.tipeIdentitas : "NIP";
                let pangkat = a.pangkat;
                let jabatan = a.jabatan;
                let role = a.role;
                if (a.tipeIdentitas && a.tipeIdentitas !== "NIP" && a.tipeIdentitas !== "NRP") {
                  pangkat = a.tipeIdentitas;
                  jabatan = a.pangkat || a.jabatan;
                  tipeId = "NIP";
                }
                if (role !== "Admin" && role !== "Staff" && role !== "Penuntut Umum Koneksitas" && role !== "Penyidik Koneksitas") {
                  if (String(role).toLowerCase().includes("admin") || String(jabatan).toLowerCase().includes("admin")) {
                    role = "Admin";
                  } else if (String(role).toLowerCase().includes("penyidik") || String(jabatan).toLowerCase().includes("penyidik")) {
                    role = "Penyidik Koneksitas";
                  } else if (String(role).toLowerCase().includes("penuntut") || String(jabatan).toLowerCase().includes("penuntut")) {
                    role = "Penuntut Umum Koneksitas";
                  } else {
                    role = "Staff";
                  }
                }
                let passwordHash = a.password || "";
                if (passwordHash && !passwordHash.startsWith("$sha256$")) {
                  passwordHash = hashPassword(passwordHash);
                }
                newAkunList.push({
                  id: uniqueId,
                  nama: a.nama && a.nama !== "-" ? a.nama : "Pengguna",
                  nip: a.nip && a.nip !== "-" ? a.nip : "",
                  tipeIdentitas: tipeId,
                  pangkat: pangkat && pangkat !== "-" ? pangkat : "",
                  jabatan: jabatan && jabatan !== "-" ? jabatan : "",
                  role,
                  // STRICT: All accounts from this webhook URL are exclusively bound to this direktorat
                  direktorat: dir,
                  username: a.username || "",
                  password: passwordHash,
                  email: a.email && a.email !== "-" ? a.email : "",
                  noHp: normalizePhoneNumber(a.noHp),
                  eSignEnabled: !!a.eSignEnabled,
                  fotoTandaTangan: a.fotoTandaTangan && a.fotoTandaTangan !== "-" ? a.fotoTandaTangan : ""
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
async function dispatchWhatsAppNotification(provider, apiKey, targetPhone, message) {
  if (!targetPhone) return { success: false, detail: "Nomor tujuan WhatsApp tidak valid." };
  if (provider === "simulasi" || !apiKey) {
    console.log(`[WA SIMULATOR] Mengirim ke ${targetPhone}:
${message}`);
    return { success: true, detail: "Terkirim via Simulator Gateway Internal JAMPIDMIL." };
  }
  try {
    if (provider === "fonnte") {
      const resp = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          target: targetPhone,
          message
        })
      });
      const data = await resp.json();
      return { success: resp.ok, detail: JSON.stringify(data) };
    } else if (provider === "wablas") {
      const resp = await fetch("https://api.wablas.com/api/send-message", {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone: targetPhone,
          message
        })
      });
      const data = await resp.json();
      return { success: resp.ok, detail: JSON.stringify(data) };
    }
  } catch (err) {
    console.error("Gagal mengirim WhatsApp:", err);
    return { success: false, detail: err?.message || String(err) };
  }
  return { success: true, detail: "Simulasi berhasil." };
}
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
app.post("/api/login", async (req, res) => {
  await initApp();
  const { username, password } = req.body || {};
  const cleanUser = String(username || "").trim().toLowerCase();
  const cleanPass = String(password || "").trim();
  if (!cleanUser) {
    return res.status(400).json({ status: "error", message: "Username atau NIP wajib diisi." });
  }
  const matchedAccount = akunList.find((a) => {
    const uName = String(a.username || "").trim().toLowerCase();
    const uNip = String(a.nip || "").trim().toLowerCase();
    const uNama = String(a.nama || "").trim().toLowerCase();
    const uEmail = String(a.email || "").trim().toLowerCase();
    return uName && uName === cleanUser || uNip && uNip === cleanUser || uNama && uNama === cleanUser || uEmail && uEmail === cleanUser;
  });
  if (matchedAccount) {
    const storedPass = String(matchedAccount.password || "").trim();
    if (storedPass && !verifyPassword(cleanPass, storedPass)) {
      return res.status(401).json({ status: "error", message: "Password yang Anda masukkan salah." });
    }
    if (storedPass && !storedPass.startsWith("$sha256$")) {
      matchedAccount.password = hashPassword(storedPass);
    }
    const safeUser = { ...matchedAccount };
    delete safeUser.password;
    return res.json({
      status: "success",
      token: `token-${matchedAccount.id}-${Date.now()}`,
      user: safeUser
    });
  }
  return res.status(401).json({ status: "error", message: "Username, NIP, atau password salah." });
});
function getUserContext(req) {
  const role = req.headers["x-user-role"] || req.query.userRole || "";
  const direktorat = req.headers["x-user-direktorat"] || req.query.userDirektorat || void 0;
  const nip = req.headers["x-user-nip"] || req.query.userNip || "";
  return { role, direktorat, nip };
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    agency: "JAMPIDMIL - Kejaksaan Republik Indonesia",
    service: "Layanan Permohonan Izin Kunjungan Tahanan (T-10) Terpadu",
    direktoratList: ["Penuntutan", "Penindakan"],
    totalSubmissions: permohonanList.length,
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/permohonan", async (req, res) => {
  try {
    await fetchAllFromGAS();
    const userContext = getUserContext(req);
    const q = (req.query.q || "").trim().toLowerCase();
    const status = req.query.status;
    const targetDir = req.query.direktorat || userContext.direktorat;
    let filtered = [...permohonanList];
    if (targetDir && targetDir !== "Semua") {
      filtered = filtered.filter((item) => (item.direktorat || "Penuntutan") === targetDir);
    }
    if (status && status !== "Semua") {
      filtered = filtered.filter((item) => item.status === status);
    }
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      filtered = filtered.filter((item) => {
        const searchableFields = [
          item.nomorSurat,
          item.nikPemohon,
          item.namaPemohon,
          item.namaTahanan,
          item.satuanTahanan,
          item.pangkatNrpTahanan,
          item.noWhatsApp,
          item.namaPengikut,
          item.lokasiRutan,
          item.hubungan,
          item.status,
          item.direktorat
        ];
        const haystack = searchableFields.map((f) => String(f || "").toLowerCase()).join(" ");
        return tokens.every((t) => haystack.includes(t));
      });
    }
    filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    res.json({
      status: "success",
      total: filtered.length,
      data: filtered
    });
  } catch (err) {
    console.error("Error in GET /api/permohonan:", err);
    res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan pada server saat memuat data permohonan.",
      error: err?.message || String(err)
    });
  }
});
app.get("/api/admin-wa", async (req, res) => {
  await fetchAllFromGAS();
  const dir = req.query.direktorat || "Penuntutan";
  let adminAcc = akunList.find(
    (a) => (a.direktorat || "Penuntutan") === dir && a.role === "Admin" && a.noHp && a.noHp.trim().length >= 9
  );
  if (!adminAcc) {
    adminAcc = akunList.find(
      (a) => (a.direktorat || "Penuntutan") === dir && a.role === "Staff" && a.noHp && a.noHp.trim().length >= 9
    );
  }
  if (!adminAcc) {
    adminAcc = akunList.find(
      (a) => (a.direktorat || "Penuntutan") === dir && a.noHp && a.noHp.trim().length >= 9
    );
  }
  let phone = adminAcc?.noHp || (dir === "Penindakan" ? "081299887766" : "081398765432");
  phone = normalizePhoneNumber(phone);
  res.json({ status: "success", direktorat: dir, waNumber: phone, adminNama: adminAcc?.nama || "Admin" });
});
app.get("/api/permohonan/:identifier", (req, res) => {
  const { identifier } = req.params;
  const cleanId = decodeURIComponent(identifier).trim().toLowerCase();
  const found = permohonanList.find(
    (item) => String(item.id || "").toLowerCase() === cleanId || String(item.nomorSurat || "").toLowerCase() === cleanId || String(item.nikPemohon || "").toLowerCase() === cleanId || String(item.namaPemohon || "").toLowerCase() === cleanId
  );
  if (!found) {
    const matches = permohonanList.filter(
      (item) => String(item.nikPemohon || "").toLowerCase() === cleanId || String(item.namaPemohon || "").toLowerCase().includes(cleanId)
    );
    if (matches.length > 0) {
      return res.json({ status: "success", multiple: true, data: matches });
    }
    return res.status(404).json({ status: "error", message: "Data permohonan tidak ditemukan." });
  }
  return res.json({ status: "success", data: found });
});
app.post("/api/permohonan", async (req, res) => {
  try {
    const input = req.body;
    const targetDirektorat = input.direktorat === "Penindakan" ? "Penindakan" : "Penuntutan";
    if (!input.namaPemohon || !input.namaTahanan || !input.tanggalKunjungan) {
      return res.status(400).json({
        status: "error",
        message: "Harap lengkapi semua kolom wajib (Nama Pemohon, Nama Tahanan, dan Tanggal Kunjungan)."
      });
    }
    await fetchAllFromGAS(true);
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const { nomorSurat, nomorUrut } = generateNextT10Number(targetDirektorat);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newPermohonan = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
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
      nomorPerkara: `BP-${String(nomorUrut).padStart(2, "0")}/${targetDirektorat === "Penindakan" ? "PID.MIL-DIK" : "PID.MIL-TUT"}/JAMPIDMIL/${currentYear}`,
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
      waNotifiedPemohon: false
    };
    permohonanList.unshift(newPermohonan);
    const dirPermohonan = permohonanList.filter((p) => p.direktorat === targetDirektorat);
    await syncAllToGAS("sync_permohonan", { list: dirPermohonan }, targetDirektorat);
    newPermohonan.syncedToGoogleSheets = true;
    const pesanAdmin = `\u{1F6A8} *NOTIFIKASI PERMOHONAN T-10 (${targetDirektorat.toUpperCase()}) MASUK*
\u{1F3DB} *JAMPIDMIL - KEJAKSAAN AGUNG RI*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4C4} *No. Surat T-10:* ${nomorSurat}
\u{1F464} *Pemohon:* ${newPermohonan.namaPemohon} (${newPermohonan.hubungan})
\u{1F396} *Tahanan:* ${newPermohonan.namaTahanan} (${newPermohonan.pangkatNrpTahanan})
\u{1F4CD} *Lokasi:* ${newPermohonan.lokasiRutan}
\u{1F4C5} *Tgl Kunjungan:* ${newPermohonan.tanggalKunjungan} (${newPermohonan.sesiKunjungan})
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_Mohon Administrator / Pejabat Penelaah ${targetDirektorat} segera memeriksa permohonan ini._`;
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
      data: newPermohonan
    });
  } catch (error) {
    console.error("Error creating permohonan:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Gagal memproses permohonan."
    });
  }
});
app.patch("/api/permohonan/:id/status", async (req, res) => {
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
    (item2) => (item2.id === id || item2.nomorSurat === id) && (!userContext.direktorat || userContext.direktorat === "Semua" || item2.direktorat === userContext.direktorat)
  );
  if (itemIndex === -1) {
    itemIndex = permohonanList.findIndex((item2) => item2.id === id || item2.nomorSurat === id);
  }
  if (itemIndex === -1) {
    return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
  }
  const item = permohonanList[itemIndex];
  if (userContext.direktorat && userContext.direktorat !== item.direktorat) {
    return res.status(403).json({
      status: "error",
      message: `Akses Ditolak: Anda (${userContext.role} ${userContext.direktorat}) tidak memiliki wewenang untuk memproses permohonan Direktorat ${item.direktorat}.`
    });
  }
  if (userContext.role === "Penuntut Umum Koneksitas" && item.direktorat !== "Penuntutan") {
    return res.status(403).json({
      status: "error",
      message: "Akses Ditolak: Penuntut Umum Koneksitas hanya berwenang memeriksa dan menandatangani permohonan Direktorat Penuntutan."
    });
  }
  if (userContext.role === "Penyidik Koneksitas" && item.direktorat !== "Penindakan") {
    return res.status(403).json({
      status: "error",
      message: "Akses Ditolak: Penyidik Koneksitas hanya berwenang memeriksa dan menandatangani permohonan Direktorat Penindakan."
    });
  }
  item.status = status || item.status;
  if (catatanPetugas !== void 0) item.catatanPetugas = catatanPetugas;
  if (namaPetugasPemeriksa !== void 0) item.namaPetugasPemeriksa = namaPetugasPemeriksa;
  if (penandatanganNama !== void 0) item.penandatanganNama = penandatanganNama;
  if (penandatanganPangkat !== void 0) item.penandatanganPangkat = penandatanganPangkat;
  if (penandatanganNip !== void 0) item.penandatanganNip = penandatanganNip;
  if (penandatanganTipeIdentitas !== void 0) item.penandatanganTipeIdentitas = penandatanganTipeIdentitas;
  if (penandatanganJabatan !== void 0) item.penandatanganJabatan = penandatanganJabatan;
  if (penandatanganTtdUrl !== void 0) item.penandatanganTtdUrl = penandatanganTtdUrl;
  item.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (systemSettings.autoNotifyWa && item.noWhatsApp) {
    let statusIcon = "\u{1F7E1}";
    let statusDesc = `Sedang diproses oleh tim penelaah berkas Direktorat ${item.direktorat || "Penuntutan"} JAMPIDMIL.`;
    if (item.status === "Disetujui") {
      statusIcon = "\u{1F7E2}";
      statusDesc = "Surat Izin Kunjungan T-10 telah TERBIT dan DISETUJUI. Silakan unduh dokumen resmi pada portal untuk dibawa saat berkunjung.";
    } else if (item.status === "Ditolak") {
      statusIcon = "\u{1F534}";
      statusDesc = `Permohonan belum dapat disetujui. Alasan/Catatan: ${item.catatanPetugas || "Persyaratan berkas belum memenuhi ketentuan."}`;
    } else if (item.status === "Selesai") {
      statusIcon = "\u{1F535}";
      statusDesc = "Kunjungan telah selesai dilaksanakan.";
    }
    const pesanPemohon = `\u{1F3DB} *INFORMASI STATUS SURAT T-10 JAMPIDMIL (${(item.direktorat || "Penuntutan").toUpperCase()})*
*Kejaksaan Agung Republik Indonesia*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
Yth. Bpk/Ibu *${item.namaPemohon}*,

Permohonan Izin Kunjungan Tahanan dengan No. Registrasi:
\u{1F4C4} *${item.nomorSurat}*
Nama Tahanan: *${item.namaTahanan}*

Status Terbaru: ${statusIcon} *${item.status.toUpperCase()}*
Keterangan: ${statusDesc}

Tgl Kunjungan: *${item.tanggalKunjungan}* (${item.sesiKunjungan})
Lokasi: *${item.lokasiRutan}*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
_Pesan otomatis Sistem Layanan T-10 JAMPIDMIL Kejaksaan RI_`;
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
  const dirPermohonan = permohonanList.filter((p) => p.direktorat === item.direktorat);
  syncAllToGAS("sync_permohonan", { list: dirPermohonan }, item.direktorat);
  lastFetchTime = 0;
  return res.json({
    status: "success",
    message: `Status berhasil diubah menjadi ${item.status}.`,
    data: item
  });
});
app.delete("/api/permohonan/:id", async (req, res) => {
  const { id } = req.params;
  const userContext = getUserContext(req);
  let itemIndex = permohonanList.findIndex(
    (item) => (item.id === id || item.nomorSurat === id) && (!userContext.direktorat || userContext.direktorat === "Semua" || item.direktorat === userContext.direktorat)
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
      message: `Akses Ditolak: Anda tidak memiliki wewenang untuk menghapus data Direktorat ${deletedItem.direktorat}.`
    });
  }
  permohonanList = permohonanList.filter((item) => item.id !== id && item.nomorSurat !== id);
  const dirPermohonan = permohonanList.filter((p) => p.direktorat === deletedItem.direktorat);
  syncAllToGAS("sync_permohonan", { list: dirPermohonan }, deletedItem.direktorat);
  return res.json({
    status: "success",
    message: "Data permohonan kunjungan berhasil dihapus."
  });
});
app.get("/api/settings", (_req, res) => {
  res.json({
    status: "success",
    data: systemSettings
  });
});
app.post("/api/settings", (req, res) => {
  const userContext = getUserContext(req);
  if (userContext.role && userContext.role !== "Admin") {
    return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator yang berwenang mengubah pengaturan sistem." });
  }
  systemSettings = { ...systemSettings, ...req.body };
  res.json({
    status: "success",
    message: "Konfigurasi sistem berhasil disimpan.",
    data: systemSettings
  });
});
app.post("/api/test-gas", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ status: "error", message: "URL Webhook wajib diisi." });
    }
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_all" })
    });
    const data = await resp.json();
    return res.json({
      status: "success",
      message: "Koneksi Webhook Google Apps Script berhasil terhubung!",
      data
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: `Gagal menghubungi Google Apps Script: ${err.message || String(err)}`
    });
  }
});
app.post("/api/test-wa", async (req, res) => {
  try {
    const { provider, apiKey, targetPhone } = req.body;
    const testMsg = "Tes koneksi WhatsApp Gateway JAMPIDMIL Berhasil.";
    const result = await dispatchWhatsAppNotification(provider, apiKey, targetPhone, testMsg);
    if (result.success) {
      return res.json({ status: "success", message: result.detail || "WhatsApp terkirim." });
    } else {
      return res.status(500).json({ status: "error", message: result.detail || "Gagal kirim pesan." });
    }
  } catch (err) {
    return res.status(500).json({ status: "error", message: err.message || "Gagal tes WhatsApp." });
  }
});
app.post("/api/sync-all", async (req, res) => {
  try {
    const userContext = getUserContext(req);
    const targetDir = userContext.direktorat ? userContext.direktorat : req.body.direktorat === "Penindakan" ? "Penindakan" : "Penuntutan";
    if (userContext.direktorat && req.body.direktorat && userContext.direktorat !== req.body.direktorat) {
      return res.status(403).json({
        status: "error",
        message: `Akses Ditolak: Anda hanya berwenang menyinkronkan data Direktorat ${userContext.direktorat}.`
      });
    }
    const filteredAkun = akunList.filter((a) => a.direktorat === targetDir);
    const filteredTahanan = tahananList.filter((t) => t.direktorat === targetDir);
    const filteredPermohonan = permohonanList.filter((p) => p.direktorat === targetDir);
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
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: `Gagal sinkronisasi data ke Spreadsheet: ${err.message}`
    });
  }
});
app.get("/api/tahanan", async (req, res) => {
  await fetchAllFromGAS();
  const userContext = getUserContext(req);
  const targetDir = req.query.direktorat || userContext.direktorat;
  let result = [...tahananList];
  if (targetDir && targetDir !== "Semua") {
    result = result.filter((t) => (t.direktorat || "Penuntutan") === targetDir);
  }
  res.json({
    status: "success",
    data: result
  });
});
app.post("/api/tahanan", async (req, res) => {
  const userContext = getUserContext(req);
  if (userContext.role === "Penuntut Umum Koneksitas" || userContext.role === "Penyidik Koneksitas") {
    return res.status(403).json({
      status: "error",
      message: "Akses Ditolak: Pejabat Penandatangan memiliki akses Read-Only untuk Master Tahanan."
    });
  }
  const dir = req.body.direktorat === "Penindakan" ? "Penindakan" : req.body.direktorat === "Penuntutan" ? "Penuntutan" : userContext.direktorat || "Penuntutan";
  const newTahanan = {
    id: req.body.id || `t-${Date.now()}`,
    namaLengkap: req.body.namaLengkap || req.body.namaTahanan || "",
    direktorat: dir,
    tempatLahir: req.body.tempatLahir || "",
    tanggalLahir: req.body.tanggalLahir || "",
    jenisKelamin: req.body.jenisKelamin || "Laki-laki",
    kebangsaan: req.body.kebangsaan || "Indonesia",
    tempatTinggal: req.body.tempatTinggal || "",
    agama: req.body.agama || "",
    pekerjaan: req.body.pekerjaan || "",
    pendidikan: req.body.pendidikan || "",
    nik: req.body.nik || "",
    tempatDitahan: req.body.tempatDitahan || req.body.lokasiRutan || "",
    namaTahanan: req.body.namaTahanan || req.body.namaLengkap,
    pangkatNrpTahanan: req.body.pangkatNrpTahanan || "-",
    satuanTahanan: req.body.satuanTahanan || "-",
    lokasiRutan: req.body.lokasiRutan || req.body.tempatDitahan || ""
  };
  tahananList.push(newTahanan);
  const dirTahanan = tahananList.filter((t) => t.direktorat === dir);
  await syncAllToGAS("sync_tahanan", { list: dirTahanan }, dir);
  lastFetchTime = 0;
  res.status(201).json({ status: "success", data: newTahanan });
});
app.put("/api/tahanan/:id", async (req, res) => {
  const { id } = req.params;
  const userContext = getUserContext(req);
  if (userContext.role === "Penuntut Umum Koneksitas" || userContext.role === "Penyidik Koneksitas") {
    return res.status(403).json({
      status: "error",
      message: "Akses Ditolak: Pejabat Penandatangan memiliki akses Read-Only untuk Master Tahanan."
    });
  }
  const idx = tahananList.findIndex((t) => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
  }
  const prevDir = tahananList[idx].direktorat || userContext.direktorat || "Penuntutan";
  const newDir = req.body.direktorat || userContext.direktorat || prevDir;
  tahananList[idx] = { ...tahananList[idx], ...req.body, direktorat: newDir };
  const dirTahananNew = tahananList.filter((t) => t.direktorat === newDir);
  await syncAllToGAS("sync_tahanan", { list: dirTahananNew }, newDir);
  if (prevDir !== newDir) {
    const dirTahananPrev = tahananList.filter((t) => t.direktorat === prevDir);
    await syncAllToGAS("sync_tahanan", { list: dirTahananPrev }, prevDir);
  }
  lastFetchTime = 0;
  res.json({ status: "success", data: tahananList[idx] });
});
app.delete("/api/tahanan/:id", async (req, res) => {
  const { id } = req.params;
  const userContext = getUserContext(req);
  if (userContext.role && userContext.role !== "Admin" && userContext.role !== "Staff") {
    return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator dan Staff yang berwenang menghapus data tahanan." });
  }
  const target = tahananList.find((t) => t.id === id);
  if (!target) return res.status(404).json({ status: "error", message: "Data tidak ditemukan." });
  if (userContext.direktorat && (target.direktorat || "Penuntutan") !== userContext.direktorat) {
    return res.status(403).json({
      status: "error",
      message: `Akses Ditolak: Anda hanya berwenang menghapus tahanan Direktorat ${userContext.direktorat}.`
    });
  }
  const dir = target.direktorat || userContext.direktorat || "Penuntutan";
  tahananList = tahananList.filter((t) => t.id !== id);
  const dirTahanan = tahananList.filter((t) => t.direktorat === dir);
  await syncAllToGAS("sync_tahanan", { list: dirTahanan }, dir);
  lastFetchTime = 0;
  res.json({ status: "success", message: "Data dihapus." });
});
app.get("/api/akun", async (req, res) => {
  await fetchAllFromGAS();
  const userContext = getUserContext(req);
  const targetDir = req.query.direktorat || userContext.direktorat;
  let result = akunList.map((a) => {
    const safe = { ...a };
    safe.password = safe.password ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "";
    return safe;
  });
  if (targetDir && targetDir !== "Semua") {
    result = result.filter((a) => (a.direktorat || "Penuntutan") === targetDir);
  }
  res.json({ status: "success", data: result });
});
app.post("/api/akun", async (req, res) => {
  const userContext = getUserContext(req);
  if (userContext.role && userContext.role !== "Admin") {
    return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator yang berwenang membuat akun." });
  }
  const dir = req.body.direktorat || userContext.direktorat || "Penuntutan";
  if (userContext.direktorat && req.body.direktorat && userContext.direktorat !== req.body.direktorat) {
    return res.status(403).json({
      status: "error",
      message: `Akses Ditolak: Anda hanya berwenang membuat akun untuk Direktorat ${userContext.direktorat}.`
    });
  }
  const rawPassword = req.body.password || "123456";
  const hashedPassword = hashPassword(rawPassword);
  const newAkun = {
    id: `a-${Date.now()}`,
    direktorat: dir,
    ...req.body,
    noHp: normalizePhoneNumber(req.body.noHp),
    password: hashedPassword
  };
  akunList.push(newAkun);
  const dirAkun = akunList.filter((a) => a.direktorat === dir);
  await syncAllToGAS("sync_akun", { list: dirAkun }, dir);
  lastFetchTime = 0;
  const safeResp = { ...newAkun };
  safeResp.password = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  res.status(201).json({ status: "success", data: safeResp });
});
app.put("/api/akun/:id", async (req, res) => {
  const { id } = req.params;
  const userContext = getUserContext(req);
  let idx = akunList.findIndex((a) => a.id === id);
  if (idx === -1 && userContext.nip) {
    idx = akunList.findIndex((a) => a.nip === userContext.nip);
  }
  if (idx === -1) {
    const bodyUsername = req.body?.username;
    if (bodyUsername) {
      idx = akunList.findIndex((a) => a.username === bodyUsername);
    }
  }
  if (idx === -1) return res.status(404).json({ status: "error", message: "Akun tidak ditemukan." });
  const isSelf = userContext.nip && userContext.nip === akunList[idx].nip;
  const isAdmin = userContext.role === "Admin";
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ status: "error", message: "Akses Ditolak: Anda tidak berwenang mengubah akun ini." });
  }
  if (isAdmin && !isSelf && userContext.direktorat && (akunList[idx].direktorat || "Penuntutan") !== userContext.direktorat) {
    return res.status(403).json({
      status: "error",
      message: `Akses Ditolak: Anda hanya berwenang mengelola akun Direktorat ${userContext.direktorat}.`
    });
  }
  const prevDir = akunList[idx].direktorat || userContext.direktorat || "Penuntutan";
  const newDir = req.body.direktorat || userContext.direktorat || prevDir;
  const updateData = { ...req.body };
  if (updateData.noHp !== void 0) {
    updateData.noHp = normalizePhoneNumber(updateData.noHp);
  }
  if (updateData.password && updateData.password !== "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022") {
    updateData.password = hashPassword(updateData.password);
  } else {
    delete updateData.password;
  }
  akunList[idx] = { ...akunList[idx], ...updateData, direktorat: newDir };
  const dirAkunNew = akunList.filter((a) => a.direktorat === newDir);
  await syncAllToGAS("sync_akun", { list: dirAkunNew }, newDir);
  if (prevDir !== newDir) {
    const dirAkunPrev = akunList.filter((a) => a.direktorat === prevDir);
    await syncAllToGAS("sync_akun", { list: dirAkunPrev }, prevDir);
  }
  lastFetchTime = 0;
  const safeResp = { ...akunList[idx] };
  safeResp.password = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
  res.json({ status: "success", data: safeResp });
});
app.delete("/api/akun/:id", async (req, res) => {
  const { id } = req.params;
  const userContext = getUserContext(req);
  if (userContext.role && userContext.role !== "Admin") {
    return res.status(403).json({ status: "error", message: "Akses Ditolak: Hanya Administrator yang berwenang menghapus akun." });
  }
  const target = akunList.find((a) => a.id === id);
  if (!target) return res.status(404).json({ status: "error", message: "Akun tidak ditemukan." });
  if (userContext.direktorat && (target.direktorat || "Penuntutan") !== userContext.direktorat) {
    return res.status(403).json({
      status: "error",
      message: `Akses Ditolak: Anda hanya berwenang menghapus akun Direktorat ${userContext.direktorat}.`
    });
  }
  const dir = target.direktorat || userContext.direktorat || "Penuntutan";
  akunList = akunList.filter((a) => a.id !== id);
  const dirAkun = akunList.filter((a) => a.direktorat === dir);
  await syncAllToGAS("sync_akun", { list: dirAkun }, dir);
  lastFetchTime = 0;
  res.json({ status: "success", message: "Akun dihapus." });
});
async function startServer() {
  const isVercelRuntime = Boolean(process.env.VERCEL);
  const isProductionBuild = process.env.NODE_ENV === "production" || isVercelRuntime;
  if (!isProductionBuild) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
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
var server_default = app;
var isServerlessEnv = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME
);
if (!isServerlessEnv) {
  void startServer();
}
export {
  app,
  server_default as default,
  hashPassword,
  initApp,
  normalizePhoneNumber,
  verifyPassword
};
