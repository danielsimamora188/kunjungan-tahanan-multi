import { NikValidationInfo } from '../types';

export const PROVINCES_MAP: Record<string, string> = {
  '11': 'Aceh',
  '12': 'Sumatera Utara',
  '13': 'Sumatera Barat',
  '14': 'Riau',
  '15': 'Jambi',
  '16': 'Sumatera Selatan',
  '17': 'Bengkulu',
  '18': 'Lampung',
  '19': 'Kepulauan Bangka Belitung',
  '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta',
  '32': 'Jawa Barat',
  '33': 'Jawa Tengah',
  '34': 'DI Yogyakarta',
  '35': 'Jawa Timur',
  '36': 'Banten',
  '51': 'Bali',
  '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah',
  '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah',
  '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara',
  '75': 'Gorontalo',
  '76': 'Sulawesi Barat',
  '81': 'Maluku',
  '82': 'Maluku Utara',
  '91': 'Papua',
  '92': 'Papua Barat',
  '93': 'Papua Selatan',
  '94': 'Papua Tengah',
  '95': 'Papua Pegunungan',
};

/**
 * Validates Indonesian NIK (Nomor Induk Kependudukan)
 * Must be strictly 16 numeric digits with valid structural parsing.
 */
export function validateNik(nik: string): NikValidationInfo {
  const cleanNik = nik.trim();
  const isNumeric = /^\d+$/.test(cleanNik);
  const is16Digits = cleanNik.length === 16;

  if (!cleanNik) {
    return {
      isValid: false,
      errorMessage: 'NIK wajib diisi',
      is16Digits: false,
      isNumeric: false,
    };
  }

  if (!isNumeric) {
    return {
      isValid: false,
      errorMessage: 'NIK hanya boleh memuat angka (0-9)',
      is16Digits,
      isNumeric: false,
    };
  }

  if (!is16Digits) {
    return {
      isValid: false,
      errorMessage: `NIK harus tepat 16 digit angka (saat ini ${cleanNik.length} digit)`,
      is16Digits: false,
      isNumeric: true,
    };
  }

  const provCode = cleanNik.substring(0, 2);
  const province = PROVINCES_MAP[provCode] || 'Wilayah Terdaftar Lainnya';

  const rawDay = parseInt(cleanNik.substring(6, 8), 10);
  const month = parseInt(cleanNik.substring(8, 10), 10);
  const rawYear = parseInt(cleanNik.substring(10, 12), 10);

  let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
  let birthDay = rawDay;

  if (rawDay > 40) {
    gender = 'Perempuan';
    birthDay = rawDay - 40;
  }

  // Validate day and month
  if (birthDay < 1 || birthDay > 31 || month < 1 || month > 12) {
    return {
      isValid: false,
      errorMessage: 'Format tanggal lahir pada digit NIK tidak valid',
      is16Digits: true,
      isNumeric: true,
      province,
    };
  }

  // Estimate full year (if YY > 26 assume 19YY, else 20YY)
  const currentShortYear = 26; // 2026
  const fullYear = rawYear > currentShortYear ? 1900 + rawYear : 2000 + rawYear;
  const formattedDate = `${String(birthDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${fullYear}`;

  return {
    isValid: true,
    province,
    gender,
    birthDate: formattedDate,
    is16Digits: true,
    isNumeric: true,
  };
}

/**
 * Normalizes Indonesian WhatsApp phone number to standard international format (e.g. 628123456789)
 */
export function normalizeWhatsAppNumber(phone: string): { isValid: boolean; normalized: string; formatted: string } {
  let cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  const isValid = /^628\d{8,12}$/.test(cleaned);
  
  // Format for display: +62 812-3456-7890
  let formatted = cleaned;
  if (cleaned.startsWith('628') && cleaned.length >= 10) {
    const part1 = cleaned.substring(0, 4); // 6281
    const part2 = cleaned.substring(4, 8);
    const part3 = cleaned.substring(8);
    formatted = `+${part1.substring(0, 2)} ${part1.substring(2)}${part2}-${part3}`;
  }

  return {
    isValid,
    normalized: cleaned,
    formatted,
  };
}

/**
 * Formats date to Indonesian locale standard
 */
export function formatIndonesianDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    // Handle YYYY-MM-DD pattern or standard date string
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${monthName} ${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Resizes and compresses a Base64 Data URL image to ensure it stays well under 45,000 characters
 * for seamless storage in Google Sheets cells.
 */
export function compressBase64Image(
  dataUrl: string,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl || '');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let compressed = canvas.toDataURL('image/jpeg', quality);
      if (compressed.length > 45000) {
        compressed = canvas.toDataURL('image/jpeg', 0.35);
      }
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Normalizes phone / WhatsApp numbers so leading zeros (08...) are never stripped
 */
export function normalizePhoneNumber(phone: any): string {
  if (!phone || phone === '-' || phone === 'undefined' || phone === 'null') return '';
  let str = String(phone).trim().replace(/^'/, '');
  if (!str) return '';
  // Convert 628... or +628... or 8... to 08...
  if (str.startsWith('+62')) {
    str = '0' + str.substring(3);
  } else if (str.startsWith('62')) {
    str = '0' + str.substring(2);
  } else if (str.startsWith('8')) {
    str = '0' + str;
  }
  return str;
}
