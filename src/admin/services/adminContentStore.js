import { getStoredSession } from './adminAuth';
import { recordActivityLog } from './adminStudioStore';

const devSeed = import.meta.env.DEV ? await import('../../dev-seed/index.js') : {};
const seedKarya = devSeed.karyaData || [];
const seedPameran = devSeed.pameranData || [];

const KARYA_STORE_KEY = 'hn_admin_karya_store_v1';
const PAMERAN_STORE_KEY = 'hn_admin_pameran_store_v1';

export const ADMIN_PAGE_SIZE = 10;

export function slugifyText(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseDimensions(dimStr) {
  const match = String(dimStr || '').match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return { widthCm: '', heightCm: '' };
  return {
    widthCm: match[1].replace(',', '.'),
    heightCm: match[2].replace(',', '.'),
  };
}

export function formatDimensionsText(widthCm, heightCm) {
  const w = String(widthCm || '').trim();
  const h = String(heightCm || '').trim();
  if (!w && !h) return '—';
  if (!w || !h) return `${w || h} cm`;
  return `${w} × ${h} cm`;
}

function normalizeImages(row) {
  const rawList = Array.isArray(row.images) ? row.images : [];
  if (rawList.length > 0) {
    return rawList.map((img, idx) => ({
      id: img.id || `${row.id}-img-${idx + 1}`,
      url: img.url,
      width: Number(img.width) || 0,
      height: Number(img.height) || 0,
      alt: img.alt || '',
      caption: img.caption || '',
      isCover: Boolean(img.isCover || idx === 0),
    }));
  }
  if (row.coverImage) {
    return [
      {
        id: `${row.id}-img-1`,
        url: row.coverImage,
        width: Number(row.width) || 0,
        height: Number(row.height) || 0,
        alt: row.coverImageAlt || '',
        caption: '',
        isCover: true,
      },
    ];
  }
  return [];
}

function mapSeedKarya(row) {
  const { widthCm, heightCm } = parseDimensions(row.dimensions);
  const images = normalizeImages(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    year: Number(row.year) || new Date().getFullYear(),
    medium: row.medium || '',
    widthCm,
    heightCm,
    dimensions: row.dimensions || formatDimensionsText(widthCm, heightCm),
    description: row.description || '',
    studioNote: row.studioNote || '',
    publishStatus: row.isDraft ? 'DRAFT' : 'PUBLISHED',
    publishedDate: (row.publishedAt || new Date().toISOString()).split('T')[0],
    availability: row.status || 'AVAILABLE',
    isFeatured: Boolean(row.isFeatured),
    images,
    updatedAt: row.updatedAt || row.publishedAt || new Date().toISOString(),
  };
}

function mapSeedPameran(row) {
  const images = normalizeImages(row);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type === 'SOLO' ? 'SOLO' : 'GROUP',
    venue: row.venue || '',
    location: row.location || '',
    startDate: row.startDate || '',
    endDate: row.endDate || '',
    curator: row.curator || '',
    description: row.curatorialNote || row.description || '',
    publishStatus: row.isDraft ? 'DRAFT' : 'PUBLISHED',
    publishedDate: (row.publishedAt || row.startDate || new Date().toISOString()).split('T')[0],
    focalPoint: row.focalPoint || '50% 35%',
    images,
    updatedAt: row.updatedAt || (row.startDate ? `${row.startDate}T10:00:00.000Z` : new Date().toISOString()),
  };
}

function safeReadStore(key, fallbackFn) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Gunakan seed data
  }
  const initial = fallbackFn();
  safeWriteStore(key, initial);
  return initial;
}

function safeWriteStore(key, items) {
  try {
    sessionStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Abaikan jika melebihi kuota sessionStorage (misal foto upload berukuran besar tetap terjaga di memory)
  }
}

let memoryKaryaCache = null;
let memoryPameranCache = null;

export function getKaryaStoreSnapshot() {
  if (!memoryKaryaCache) {
    memoryKaryaCache = safeReadStore(KARYA_STORE_KEY, () => seedKarya.map(mapSeedKarya));
  }
  return memoryKaryaCache;
}

function commitKaryaStore(nextList) {
  memoryKaryaCache = nextList;
  safeWriteStore(KARYA_STORE_KEY, nextList);
}

export function getPameranStoreSnapshot() {
  if (!memoryPameranCache) {
    memoryPameranCache = safeReadStore(PAMERAN_STORE_KEY, () => seedPameran.map(mapSeedPameran));
  }
  return memoryPameranCache;
}

function commitPameranStore(nextList) {
  memoryPameranCache = nextList;
  safeWriteStore(PAMERAN_STORE_KEY, nextList);
}

// =============================================================================
// KARYA CRUD SERVICE
// =============================================================================

export async function listArtworksAdmin({
  search = '',
  publishFilter = 'ALL',
  availabilityFilter = 'ALL',
  sortBy = 'updated_desc',
  page = 1,
  pageSize = ADMIN_PAGE_SIZE,
  simulateState = null,
} = {}) {
  await new Promise((r) => window.setTimeout(r, 220));
  if (simulateState === 'error') {
    throw new Error('Gagal memuat daftar karya dari server studio.');
  }
  if (simulateState === 'empty') {
    return { items: [], total: 0, totalPages: 1, page: 1 };
  }

  let list = [...getKaryaStoreSnapshot()];

  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        String(item.year).includes(q)
    );
  }

  if (publishFilter !== 'ALL') {
    list = list.filter((item) => item.publishStatus === publishFilter);
  }

  if (availabilityFilter !== 'ALL') {
    list = list.filter((item) => item.availability === availabilityFilter);
  }

  list.sort((a, b) => {
    if (sortBy === 'year_desc') return b.year - a.year;
    if (sortBy === 'year_asc') return a.year - b.year;
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'id-ID');
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(Number(page) || 1, totalPages));
  const start = (safePage - 1) * pageSize;

  return {
    items: list.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
  };
}

export async function getArtworkAdminBySlug(slug) {
  await new Promise((r) => window.setTimeout(r, 180));
  const list = getKaryaStoreSnapshot();
  return list.find((item) => item.slug === slug) || null;
}

export async function saveArtworkAdmin(payload) {
  await new Promise((r) => window.setTimeout(r, 260));
  const list = [...getKaryaStoreSnapshot()];
  const normalizedSlug = slugifyText(payload.slug || payload.title);

  const collision = list.find(
    (item) => item.slug === normalizedSlug && item.id !== payload.id
  );
  if (collision) {
    throw new Error('Slug sudah digunakan karya lain. Gunakan slug yang unik.');
  }

  const nowIso = new Date().toISOString();
  const dimensions = formatDimensionsText(payload.widthCm, payload.heightCm);
  const record = {
    ...payload,
    id: payload.id || `kr-${Date.now().toString(36)}`,
    slug: normalizedSlug,
    year: Number(payload.year) || new Date().getFullYear(),
    dimensions,
    images: (payload.images || []).map((img, i) => ({
      ...img,
      isCover: i === 0,
    })),
    updatedAt: nowIso,
  };

  const existingIndex = list.findIndex((item) => item.id === record.id);
  const isCreate = existingIndex < 0;
  if (existingIndex >= 0) {
    list[existingIndex] = record;
  } else {
    list.unshift(record);
  }
  commitKaryaStore(list);
  const actor = getStoredSession();
  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: record.publishStatus === 'PUBLISHED' ? 'PUBLISH' : isCreate ? 'CREATE' : 'UPDATE',
    itemType: 'Karya',
    itemTitle: record.title,
  });
  return record;
}

export async function setArtworkPublishStatusAdmin(id, nextStatus) {
  await new Promise((r) => window.setTimeout(r, 200));
  const list = [...getKaryaStoreSnapshot()];
  const idx = list.findIndex((item) => item.id === id);
  if (idx < 0) throw new Error('Data karya tidak ditemukan.');
  list[idx] = {
    ...list[idx],
    publishStatus: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  commitKaryaStore(list);
  const actor = getStoredSession();
  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: nextStatus === 'ARCHIVED' ? 'ARCHIVE' : 'PUBLISH',
    itemType: 'Karya',
    itemTitle: list[idx].title,
  });
  return list[idx];
}

// =============================================================================
// PAMERAN CRUD SERVICE
// =============================================================================

export async function listExhibitionsAdmin({
  search = '',
  publishFilter = 'ALL',
  sortBy = 'updated_desc',
  page = 1,
  pageSize = ADMIN_PAGE_SIZE,
  simulateState = null,
} = {}) {
  await new Promise((r) => window.setTimeout(r, 220));
  if (simulateState === 'error') {
    throw new Error('Gagal memuat daftar pameran dari server studio.');
  }
  if (simulateState === 'empty') {
    return { items: [], total: 0, totalPages: 1, page: 1 };
  }

  let list = [...getPameranStoreSnapshot()];

  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.venue.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
    );
  }

  if (publishFilter !== 'ALL') {
    list = list.filter((item) => item.publishStatus === publishFilter);
  }

  list.sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime();
    if (sortBy === 'date_asc') return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'id-ID');
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(Number(page) || 1, totalPages));
  const start = (safePage - 1) * pageSize;

  return {
    items: list.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
  };
}

export async function getExhibitionAdminBySlug(slug) {
  await new Promise((r) => window.setTimeout(r, 180));
  const list = getPameranStoreSnapshot();
  return list.find((item) => item.slug === slug) || null;
}

export async function saveExhibitionAdmin(payload) {
  await new Promise((r) => window.setTimeout(r, 260));
  const list = [...getPameranStoreSnapshot()];
  const normalizedSlug = slugifyText(payload.slug || payload.title);

  const collision = list.find(
    (item) => item.slug === normalizedSlug && item.id !== payload.id
  );
  if (collision) {
    throw new Error('Slug sudah digunakan pameran lain. Gunakan slug yang unik.');
  }

  const nowIso = new Date().toISOString();
  const record = {
    ...payload,
    id: payload.id || `ex-${Date.now().toString(36)}`,
    slug: normalizedSlug,
    images: (payload.images || []).map((img, i) => ({
      ...img,
      isCover: i === 0,
    })),
    updatedAt: nowIso,
  };

  const existingIndex = list.findIndex((item) => item.id === record.id);
  const isCreate = existingIndex < 0;
  if (existingIndex >= 0) {
    list[existingIndex] = record;
  } else {
    list.unshift(record);
  }
  commitPameranStore(list);
  const actor = getStoredSession();
  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: record.publishStatus === 'PUBLISHED' ? 'PUBLISH' : isCreate ? 'CREATE' : 'UPDATE',
    itemType: 'Pameran',
    itemTitle: record.title,
  });
  return record;
}

export async function setExhibitionPublishStatusAdmin(id, nextStatus) {
  await new Promise((r) => window.setTimeout(r, 200));
  const list = [...getPameranStoreSnapshot()];
  const idx = list.findIndex((item) => item.id === id);
  if (idx < 0) throw new Error('Data pameran tidak ditemukan.');
  list[idx] = {
    ...list[idx],
    publishStatus: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  commitPameranStore(list);
  const actor = getStoredSession();
  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: nextStatus === 'ARCHIVED' ? 'ARCHIVE' : 'PUBLISH',
    itemType: 'Pameran',
    itemTitle: list[idx].title,
  });
  return list[idx];
}

