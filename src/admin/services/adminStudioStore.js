import { LOCAL_ACCOUNTS } from './adminAuth';

const devSeed = import.meta.env.DEV ? await import('../../dev-seed/index.js') : {};
const seedArticles = devSeed.articles || [];
const seedCustomOrderSteps = devSeed.customOrderSteps || [];
const seedSiteSettings = devSeed.siteSettings;
const seedKarya = devSeed.karyaData || [];
const seedPameran = devSeed.pameranData || [];
const studioPortrait = devSeed.studioPortrait || '';

const ARTIKEL_STORE_KEY = 'hn_admin_artikel_store_v1';
const SETTINGS_STORE_KEY = 'hn_admin_settings_store_v1';
const USERS_STORE_KEY = 'hn_admin_users_store_v1';
const LOGS_STORE_KEY = 'hn_admin_logs_store_v1';

export const ARTICLE_CATEGORY_OPTIONS = [
  'ARTISTIC PRACTICE',
  'ARTIST INTERVIEW',
  'EXHIBITION NOTES',
  'CATATAN STUDIO',
  'ESAI KURATORIAL',
];

export const LOGS_PAGE_SIZE = 25;

function slugifyArtikel(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function estimateReadingMinutes(contentBlocks = [], summary = '') {
  const combined = [summary, ...(Array.isArray(contentBlocks) ? contentBlocks : [])]
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .join(' ');
  const words = combined ? combined.split(/\s+/).filter(Boolean).length : 0;
  return {
    words,
    minutes: Math.max(1, Math.ceil(words / 180)),
  };
}

function safeRead(key, fallbackFn) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed !== null && parsed !== undefined) return parsed;
    }
  } catch {
    // Gunakan fallback bawaan
  }
  const initial = fallbackFn();
  safeWrite(key, initial);
  return initial;
}

function safeWrite(key, data) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Abaikan jika melebihi kuota sessionStorage
  }
}

// =============================================================================
// CACHE MEMORI AGAR UNGGAHAN FOTO BESAR TETAP TERJAGA DI SESI AKTIF
// =============================================================================
let artikelCache = null;
let settingsCache = null;
let usersCache = null;
let logsCache = null;

function mapSeedArticle(row) {
  const content = Array.isArray(row.content) && row.content.length > 0 ? [...row.content] : [''];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category || 'ARTISTIC PRACTICE',
    summary: row.summary || '',
    content,
    quote: row.quote || '',
    author: row.author || 'Husen Nursidik',
    place: row.place || '',
    readingMinutes: Number(row.readingMinutes) || estimateReadingMinutes(content, row.summary).minutes,
    publishStatus: row.isDraft ? 'DRAFT' : 'PUBLISHED',
    publishedDate: (row.publishedAt || new Date().toISOString()).split('T')[0],
    images: row.coverImage
      ? [
          {
            id: `${row.id}-cover`,
            url: row.coverImage,
            width: Number(row.width) || 1200,
            height: Number(row.height) || 900,
            alt: row.coverImageAlt || '',
            isCover: true,
          },
        ]
      : [],
    updatedAt: row.updatedAt || row.publishedAt || new Date().toISOString(),
  };
}

function buildInitialSettings() {
  if (!import.meta.env.DEV) {
    return {
      contact: {},
      pageContent: {},
      analytics: { ga4Url: '', lookerEmbedUrl: '' },
      lastUpdatedBy: '',
      lastUpdatedAt: '',
    };
  }

  return {
    contact: {
      whatsapp: seedSiteSettings.contact.phoneDisplay,
      email: seedSiteSettings.contact.emailDisplay,
      instagram: seedSiteSettings.contact.instagramDisplay,
      facebook: seedSiteSettings.contact.facebookDisplay,
      locationNotes: seedSiteSettings.contact.locationNotes,
      copyrightText: seedSiteSettings.copyrightText,
    },
    pageContent: {
      heroQuote:
        'Stories, people, and places become color. Colors become memories through raw impasto and living pigment.',
      tentang: {
        biografi:
          'Husen Nursidik mendedikasikan seluruh hidup keseniannya untuk merekam getaran batin manusia, kedalaman afeksi keluarga, dan lanskap memori personal. Ia tidak memandang kanvas sebagai bidang datar untuk meniru objek, melainkan arena pertemuan rasa yang diwujudkan melalui goresan pisau palet tegas dan timbunan minyak rami.',
        filosofi:
          'Saya tidak melukis untuk mempercantik dinding. Saya melukis untuk menyentuh kembali ruang sunyi di dalam dada manusia.',
        perjalanan:
          'Menekuni praktik lukis ekspresionis figuratif dengan presentasi karya dan pameran di Galeri Nasional Indonesia Jakarta, Maya Sanur Art Pavilion Bali, dan Jogja Art Fair Special Pavilion Yogyakarta.',
        praktik:
          'Menggunakan pigmen mineral berkualitas tinggi—ochre tanah, burnt sienna hangat, dan ultramarine pekat—setiap lukisan dibangun dengan ketebalan fisik (impasto) yang menangkap jatuhnya cahaya alami dan memberikan dimensi taktil yang hidup pada ruang hunian.',
        jenisKarya:
          'Lukisan cat minyak impasto di atas kanvas dan linen Belgia, seri pameran, serta komisi lukisan khusus sesuai ruang.',
        portraitUrl: studioPortrait,
        portraitAlt: 'Husen Nursidik di Studio Lukis',
      },
      customOrderSteps: seedCustomOrderSteps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        title: s.title,
        description: s.description,
      })),
    },
    analytics: {
      ga4Url: '',
      lookerEmbedUrl: '',
    },
    lastUpdatedBy: 'Husen Nursidik',
    lastUpdatedAt: '2026-10-18T09:30:00.000Z',
  };
}

function buildInitialUsers() {
  if (!import.meta.env.DEV) return [];

  return LOCAL_ACCOUNTS.map((acc, idx) => ({
    id: acc.id,
    name: acc.name,
    email: acc.email,
    role: acc.role,
    status: 'ACTIVE', // 'ACTIVE' | 'PENDING' | 'INACTIVE'
    lastLoginAt: idx === 0 ? new Date(Date.now() - 2 * 3600000).toISOString() : new Date(Date.now() - 26 * 3600000).toISOString(),
    invitedAt: '2025-01-12T08:00:00.000Z',
  }));
}

function buildInitialAuditLogs() {
  if (!import.meta.env.DEV) return [];

  const seed = [];
  const authors = [
    { name: 'Husen Nursidik', role: 'OWNER' },
    { name: 'Admin Studio', role: 'ADMIN' },
  ];

  seedKarya.forEach((k, i) => {
    seed.push({
      id: `log-k-${i}`,
      timestamp: k.publishedAt || new Date(Date.now() - (i + 3) * 86400000).toISOString(),
      userName: authors[i % 2].name,
      userRole: authors[i % 2].role,
      action: 'PUBLISH',
      itemType: 'Karya',
      itemTitle: k.title,
    });
  });

  seedPameran.forEach((p, i) => {
    seed.push({
      id: `log-p-${i}`,
      timestamp: `${p.startDate || '2025-02-10'}T10:15:00.000Z`,
      userName: authors[(i + 1) % 2].name,
      userRole: authors[(i + 1) % 2].role,
      action: i === 0 ? 'PUBLISH' : 'UPDATE',
      itemType: 'Pameran',
      itemTitle: p.title,
    });
  });

  seedArticles.forEach((a, i) => {
    seed.push({
      id: `log-a-${i}`,
      timestamp: a.publishedAt || new Date(Date.now() - (i + 20) * 86400000).toISOString(),
      userName: 'Husen Nursidik',
      userRole: 'OWNER',
      action: 'PUBLISH',
      itemType: 'Artikel',
      itemTitle: a.title,
    });
  });

  // Tambah riwayat autentikasi & pengaturan serta variasi aksi agar paginasi/filter lengkap
  const nowMs = Date.now();
  const recentOps = [
    { h: 1, u: 0, a: 'LOGIN', t: 'Sesi', title: 'Panel Studio' },
    { h: 3, u: 1, a: 'UPDATE', t: 'Karya', title: seedKarya[0]?.title || 'Cahaya Dari Arah Barat' },
    { h: 5, u: 0, a: 'UPDATE', t: 'Pengaturan Situs', title: 'Kontak & Lokasi Studio' },
    { h: 9, u: 1, a: 'CREATE', t: 'Karya', title: seedKarya[1]?.title || 'Dekapan Dalam Waktu (Embrace)' },
    { h: 14, u: 1, a: 'LOGIN', t: 'Sesi', title: 'Panel Studio' },
    { h: 20, u: 0, a: 'ARCHIVE', t: 'Karya', title: 'Sketsa Awal 2024' },
    { h: 28, u: 0, a: 'CREATE', t: 'Artikel', title: seedArticles[0]?.title || 'Colors as Language' },
    { h: 36, u: 1, a: 'UPDATE', t: 'Pameran', title: seedPameran[0]?.title || 'House of Art' },
    { h: 48, u: 0, a: 'DELETE', t: 'Karya', title: 'Lampiran Duplikat Studio' },
    { h: 60, u: 0, a: 'UPDATE', t: 'Pengguna', title: 'Admin Studio' },
    { h: 72, u: 1, a: 'UPDATE', t: 'Artikel', title: seedArticles[1]?.title || 'The Studio Visit' },
    { h: 84, u: 0, a: 'CREATE', t: 'Pameran', title: seedPameran[1]?.title || 'Pancaran Bentuk & Tubuh' },
    { h: 96, u: 1, a: 'LOGIN', t: 'Sesi', title: 'Panel Studio' },
    { h: 108, u: 0, a: 'PUBLISH', t: 'Artikel', title: seedArticles[2]?.title || 'Seeing the Familiar' },
    { h: 120, u: 1, a: 'UPDATE', t: 'Karya', title: seedKarya[2]?.title || 'Figure Study 01' },
    { h: 132, u: 0, a: 'UPDATE', t: 'Karya', title: seedKarya[3]?.title || 'Pasar Sore' },
    { h: 144, u: 1, a: 'UPDATE', t: 'Karya', title: seedKarya[4]?.title || 'Panen Ceria' },
    { h: 156, u: 0, a: 'LOGIN', t: 'Sesi', title: 'Panel Studio' },
  ];

  recentOps.forEach((op, idx) => {
    seed.push({
      id: `log-op-${idx}`,
      timestamp: new Date(nowMs - op.h * 3600000).toISOString(),
      userName: authors[op.u].name,
      userRole: authors[op.u].role,
      action: op.a,
      itemType: op.t,
      itemTitle: op.title,
    });
  });

  return seed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// =============================================================================
// AUDIT LOG SERVICE
// =============================================================================
export function getLogsStoreSnapshot() {
  if (!logsCache) {
    logsCache = safeRead(LOGS_STORE_KEY, buildInitialAuditLogs);
  }
  return logsCache;
}

export function recordActivityLog({
  userName = 'Husen Nursidik',
  userRole = 'OWNER',
  action = 'UPDATE',
  itemType = 'Karya',
  itemTitle = '',
}) {
  const list = [...getLogsStoreSnapshot()];
  const entry = {
    id: `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    userName,
    userRole,
    action,
    itemType,
    itemTitle,
  };
  list.unshift(entry);
  logsCache = list.slice(0, 500);
  safeWrite(LOGS_STORE_KEY, logsCache);
  return entry;
}

export async function listActivityLogsAdmin({
  userFilter = 'ALL',
  actionFilter = 'ALL',
  typeFilter = 'ALL',
  dateFrom = '',
  dateTo = '',
  page = 1,
  pageSize = LOGS_PAGE_SIZE,
  simulateState = null,
} = {}) {
  await new Promise((r) => window.setTimeout(r, 180));
  if (simulateState === 'error') {
    throw new Error('Gagal memuat catatan log aktivitas studio.');
  }
  if (simulateState === 'empty') {
    return { items: [], total: 0, totalPages: 1, page: 1, users: [] };
  }

  const all = [...getLogsStoreSnapshot()];
  const uniqueUsers = Array.from(new Set(all.map((l) => l.userName))).sort((a, b) =>
    a.localeCompare(b, 'id-ID')
  );

  let filtered = all;
  if (userFilter !== 'ALL') {
    filtered = filtered.filter((l) => l.userName === userFilter);
  }
  if (actionFilter !== 'ALL') {
    filtered = filtered.filter((l) => l.action === actionFilter);
  }
  if (typeFilter !== 'ALL') {
    filtered = filtered.filter((l) => l.itemType === typeFilter);
  }
  if (dateFrom) {
    const fromMs = new Date(`${dateFrom}T00:00:00`).getTime();
    if (!Number.isNaN(fromMs)) {
      filtered = filtered.filter((l) => new Date(l.timestamp).getTime() >= fromMs);
    }
  }
  if (dateTo) {
    const toMs = new Date(`${dateTo}T23:59:59.999`).getTime();
    if (!Number.isNaN(toMs)) {
      filtered = filtered.filter((l) => new Date(l.timestamp).getTime() <= toMs);
    }
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(1, Math.min(Number(page) || 1, totalPages));
  const start = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
    users: uniqueUsers,
  };
}

// =============================================================================
// ARTIKEL CRUD SERVICE
// =============================================================================
export function getArtikelStoreSnapshot() {
  if (!artikelCache) {
    artikelCache = safeRead(ARTIKEL_STORE_KEY, () => seedArticles.map(mapSeedArticle));
  }
  return artikelCache;
}

function commitArtikelStore(nextList) {
  artikelCache = nextList;
  safeWrite(ARTIKEL_STORE_KEY, nextList);
}

export async function listArticlesAdmin({
  search = '',
  publishFilter = 'ALL',
  sortBy = 'updated_desc',
  page = 1,
  pageSize = 10,
  simulateState = null,
} = {}) {
  await new Promise((r) => window.setTimeout(r, 200));
  if (simulateState === 'error') {
    throw new Error('Gagal memuat daftar artikel dari server studio.');
  }
  if (simulateState === 'empty') {
    return { items: [], total: 0, totalPages: 1, page: 1 };
  }

  let list = [...getArtikelStoreSnapshot()];
  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }
  if (publishFilter !== 'ALL') {
    list = list.filter((item) => item.publishStatus === publishFilter);
  }

  list.sort((a, b) => {
    if (sortBy === 'title_asc') return a.title.localeCompare(b.title, 'id-ID');
    if (sortBy === 'date_asc') {
      return new Date(a.publishedDate || 0).getTime() - new Date(b.publishedDate || 0).getTime();
    }
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
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

export async function getArticleAdminBySlug(slug) {
  await new Promise((r) => window.setTimeout(r, 180));
  return getArtikelStoreSnapshot().find((item) => item.slug === slug) || null;
}

export async function saveArticleAdmin(payload, actor = null) {
  await new Promise((r) => window.setTimeout(r, 240));
  const list = [...getArtikelStoreSnapshot()];
  const normalizedSlug = slugifyArtikel(payload.slug || payload.title);

  const collision = list.find(
    (item) => item.slug === normalizedSlug && item.id !== payload.id
  );
  if (collision) {
    throw new Error('Slug sudah digunakan artikel lain. Gunakan slug yang unik.');
  }

  const nowIso = new Date().toISOString();
  const isCreate = !payload.id;
  const record = {
    ...payload,
    id: payload.id || `art-${Date.now().toString(36)}`,
    slug: normalizedSlug,
    updatedAt: nowIso,
  };

  const existingIndex = list.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    list[existingIndex] = record;
  } else {
    list.unshift(record);
  }
  commitArtikelStore(list);

  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: record.publishStatus === 'PUBLISHED' ? 'PUBLISH' : isCreate ? 'CREATE' : 'UPDATE',
    itemType: 'Artikel',
    itemTitle: record.title,
  });

  return record;
}

export async function setArticlePublishStatusAdmin(id, nextStatus, actor = null) {
  await new Promise((r) => window.setTimeout(r, 180));
  const list = [...getArtikelStoreSnapshot()];
  const idx = list.findIndex((item) => item.id === id);
  if (idx < 0) throw new Error('Data artikel tidak ditemukan.');
  list[idx] = {
    ...list[idx],
    publishStatus: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  commitArtikelStore(list);

  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: nextStatus === 'ARCHIVED' ? 'ARCHIVE' : 'PUBLISH',
    itemType: 'Artikel',
    itemTitle: list[idx].title,
  });

  return list[idx];
}

// =============================================================================
// PENGATURAN SITUS SERVICE
// =============================================================================
export function getSiteSettingsStoreSnapshot() {
  if (!settingsCache) {
    settingsCache = safeRead(SETTINGS_STORE_KEY, buildInitialSettings);
  }
  return settingsCache;
}

export async function getSiteSettingsAdmin({ simulateState = null } = {}) {
  await new Promise((r) => window.setTimeout(r, 180));
  if (simulateState === 'error') {
    throw new Error('Gagal memuat pengaturan situs dari server studio.');
  }
  return structuredClone(getSiteSettingsStoreSnapshot());
}

export async function saveSiteSettingsSectionAdmin(sectionKey, nextData, actor, sectionLabel) {
  await new Promise((r) => window.setTimeout(r, 240));
  const current = structuredClone(getSiteSettingsStoreSnapshot());
  const updated = {
    ...current,
    [sectionKey]: nextData,
    lastUpdatedBy: actor?.name || 'Husen Nursidik',
    lastUpdatedAt: new Date().toISOString(),
  };
  settingsCache = updated;
  safeWrite(SETTINGS_STORE_KEY, updated);

  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: 'UPDATE',
    itemType: 'Pengaturan Situs',
    itemTitle: sectionLabel || sectionKey,
  });

  return structuredClone(updated);
}

// =============================================================================
// PENGGUNA (USERS) SERVICE — KHUSUS OWNER
// =============================================================================
export function getUsersStoreSnapshot() {
  if (!usersCache) {
    usersCache = safeRead(USERS_STORE_KEY, buildInitialUsers);
  }
  return usersCache;
}

function commitUsersStore(nextList) {
  usersCache = nextList;
  safeWrite(USERS_STORE_KEY, nextList);
}

export function touchUserLoginRecord(user) {
  const list = [...getUsersStoreSnapshot()];
  const idx = list.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      status: list[idx].status === 'PENDING' ? 'ACTIVE' : list[idx].status,
      lastLoginAt: new Date().toISOString(),
    };
    commitUsersStore(list);
  }
  recordActivityLog({
    userName: user.name,
    userRole: user.role,
    action: 'LOGIN',
    itemType: 'Sesi',
    itemTitle: 'Panel Studio',
  });
}

export async function listUsersAdmin({ simulateState = null } = {}) {
  await new Promise((r) => window.setTimeout(r, 180));
  if (simulateState === 'error') {
    throw new Error('Gagal memuat daftar pengguna studio.');
  }
  if (simulateState === 'empty') {
    return [];
  }
  return [...getUsersStoreSnapshot()];
}

export async function inviteUserAdmin({ name, email, role }, actor) {
  await new Promise((r) => window.setTimeout(r, 240));
  const list = [...getUsersStoreSnapshot()];
  const normEmail = String(email || '').trim().toLowerCase();
  const exists = list.some((u) => u.email.toLowerCase() === normEmail);
  if (exists) {
    throw new Error('Surel tersebut sudah terdaftar pada daftar pengguna studio.');
  }

  const newUser = {
    id: `usr-${Date.now().toString(36)}`,
    name: String(name || '').trim(),
    email: normEmail,
    role: role === 'OWNER' ? 'OWNER' : 'ADMIN',
    status: 'PENDING',
    lastLoginAt: null,
    invitedAt: new Date().toISOString(),
  };
  list.push(newUser);
  commitUsersStore(list);

  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: 'CREATE',
    itemType: 'Pengguna',
    itemTitle: `${newUser.name} (${newUser.role})`,
  });

  return newUser;
}

export async function toggleUserActiveAdmin(targetId, actor) {
  await new Promise((r) => window.setTimeout(r, 200));
  if (actor && (targetId === actor.id || getUsersStoreSnapshot().find((u) => u.id === targetId)?.email.toLowerCase() === actor.email.toLowerCase())) {
    throw new Error('Anda tidak dapat menonaktifkan akun Anda sendiri.');
  }

  const list = [...getUsersStoreSnapshot()];
  const idx = list.findIndex((u) => u.id === targetId);
  if (idx < 0) throw new Error('Pengguna tidak ditemukan.');

  const isCurrentlyInactive = list[idx].status === 'INACTIVE';
  const nextStatus = isCurrentlyInactive ? (list[idx].lastLoginAt ? 'ACTIVE' : 'PENDING') : 'INACTIVE';

  list[idx] = {
    ...list[idx],
    status: nextStatus,
  };
  commitUsersStore(list);

  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: 'UPDATE',
    itemType: 'Pengguna',
    itemTitle: `${list[idx].name} — ${nextStatus === 'INACTIVE' ? 'Dinonaktifkan' : 'Diaktifkan'}`,
  });

  return list[idx];
}

export async function resendInviteAdmin(targetId, actor) {
  await new Promise((r) => window.setTimeout(r, 200));
  const target = getUsersStoreSnapshot().find((u) => u.id === targetId);
  if (!target) throw new Error('Pengguna tidak ditemukan.');
  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: 'UPDATE',
    itemType: 'Pengguna',
    itemTitle: `Kirim ulang undangan: ${target.email}`,
  });
  return target;
}

export async function resetUserPasswordAdmin(targetId, actor) {
  await new Promise((r) => window.setTimeout(r, 200));
  const target = getUsersStoreSnapshot().find((u) => u.id === targetId);
  if (!target) throw new Error('Pengguna tidak ditemukan.');
  recordActivityLog({
    userName: actor?.name || 'Husen Nursidik',
    userRole: actor?.role || 'OWNER',
    action: 'UPDATE',
    itemType: 'Pengguna',
    itemTitle: `Atur ulang kata sandi: ${target.email}`,
  });
  return target;
}

