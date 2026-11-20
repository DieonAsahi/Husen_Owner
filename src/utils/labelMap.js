/**
 * Helper Pemetaan Label Kuratorial & Status — Bahasa Indonesia
 * Nilai enum di data (AVAILABLE, SOLD, SOLO, dll.) tetap utuh.
 */

const ARTWORK_STATUS_STYLES = {
  AVAILABLE: {
    label: 'TERSEDIA',
    color: '#41603A',
    tint: 'rgba(65, 96, 58, 0.16)', // Paling mencolok (16%)
    border: 'rgba(65, 96, 58, 0.50)',
    ring: 'rgba(65, 96, 58, 0.20)',
  },
  SOLD: {
    label: 'TERJUAL',
    color: '#8C3B22',
    tint: 'rgba(140, 59, 34, 0.11)', // 11%
    border: 'rgba(140, 59, 34, 0.50)',
    ring: 'rgba(140, 59, 34, 0.20)',
  },
  PRIVATE_COLLECTION: {
    label: 'KOLEKSI PRIBADI',
    color: '#5F574C',
    tint: 'rgba(95, 87, 76, 0.11)', // 11%
    border: 'rgba(95, 87, 76, 0.50)',
    ring: 'rgba(95, 87, 76, 0.20)',
  },
};

const STATUS_LABELS = {
  AVAILABLE: 'TERSEDIA',
  SOLD: 'TERJUAL',
  PRIVATE_COLLECTION: 'KOLEKSI PRIBADI',
};

const EXHIBITION_TYPE_LABELS = {
  SOLO: 'PAMERAN TUNGGAL',
  GROUP: 'PAMERAN BERSAMA',
};

/**
 * Format status karya ke Bahasa Indonesia
 * @param {string} status - Enum status ('AVAILABLE' | 'SOLD' | 'PRIVATE_COLLECTION')
 * @returns {string} Label status dalam Bahasa Indonesia
 */
export function formatStatus(status) {
  if (!status) return '';
  return ARTWORK_STATUS_STYLES[status]?.label || STATUS_LABELS[status] || status;
}

export function getArtworkStatus(status) {
  return ARTWORK_STATUS_STYLES[status] || null;
}

/**
 * Format tipe pameran ke Bahasa Indonesia
 * @param {string} type - Enum tipe ('SOLO' | 'GROUP')
 * @param {string} [badgeText] - Optional fallback teks badge
 * @returns {string} Label tipe pameran dalam Bahasa Indonesia
 */
export function formatExhibitionType(type, badgeText) {
  if (badgeText) {
    const upper = badgeText.toUpperCase();
    if (upper.includes('SOLO')) return 'PAMERAN TUNGGAL';
    if (upper.includes('GROUP') || upper.includes('SHOWCASE') || upper.includes('BERSAMA')) {
      return 'PAMERAN BERSAMA';
    }
  }
  return EXHIBITION_TYPE_LABELS[type] || type || '';
}

/**
 * Helper untuk menyusun string baris keterangan pameran:
 * tipe · venue · kota · tanggal
 */
export function formatExhibitionWallLabel(exhibition) {
  if (!exhibition) return '';
  const parts = [];

  const typeLabel = formatExhibitionType(exhibition.type, exhibition.badgeText);
  if (typeLabel) parts.push(typeLabel);

  if (exhibition.venue) parts.push(exhibition.venue);

  // Ambil nama kota dari lokasi (misal 'Jakarta, Indonesia' -> 'Jakarta')
  if (exhibition.location) {
    const city = exhibition.location.split(',')[0].trim();
    if (city) parts.push(city);
  }

  // Format tanggal pameran Bahasa Indonesia
  if (exhibition.startDate) {
    parts.push(formatExhibitionDateRange(exhibition.startDate, exhibition.endDate));
  } else if (exhibition.year) {
    parts.push(String(exhibition.year));
  }

  return parts.join(' · ');
}

/**
 * Format rentang tanggal pameran bahasa Indonesia lewat Intl.DateTimeFormat('id-ID'):
 * - Beda bulan: "15 September - 25 Oktober 2023"
 * - Bulan sama: "15 - 25 Oktober 2023"
 * - Tanpa tanggal akhir / tanggal sama: "15 September 2023"
 */
export function formatExhibitionDateRange(startDate, endDate) {
  if (!startDate) return '';
  try {
    const parseYMD = (str) => {
      if (!str) return null;
      const parts = str.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return {
          year: parts[0],
          month: parts[1],
          day: parts[2],
          date: new Date(parts[0], parts[1] - 1, parts[2]),
        };
      }
      return null;
    };

    const d1 = parseYMD(startDate);
    if (!d1) return startDate;

    const fullDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' });

    if (!endDate || endDate === startDate) {
      return fullDate.format(d1.date);
    }

    const d2 = parseYMD(endDate);
    if (!d2) {
      return fullDate.format(d1.date);
    }

    if (d1.year === d2.year) {
      if (d1.month === d2.month) {
        return `${d1.day} - ${fullDate.format(d2.date)}`;
      }
      return `${dayMonth.format(d1.date)} - ${fullDate.format(d2.date)}`;
    }
    return `${fullDate.format(d1.date)} - ${fullDate.format(d2.date)}`;
  } catch {
    return startDate;
  }
}
