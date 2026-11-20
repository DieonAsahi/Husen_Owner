/**
 * Lapisan Pemetaan Murni (Pure Mappers) — Frontend Model <-> Skema SQL Supabase (docs/db/schema.sql)
 *
 * Seluruh fungsi di berkas ini bersifat murni (tanpa efek samping, tanpa DOM, tanpa panggilan jaringan)
 * agar dapat diuji langsung di Node maupun digunakan oleh service React dan Supabase nanti.
 */

const PUBLISH_SQL_TO_UI = {
  draft: 'DRAFT',
  published: 'PUBLISHED',
  archived: 'ARCHIVED',
};

const PUBLISH_UI_TO_SQL = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

const ROLE_SQL_TO_UI = {
  admin: 'ADMIN',
  owner: 'OWNER',
};

const ROLE_UI_TO_SQL = {
  ADMIN: 'admin',
  OWNER: 'owner',
};

const LOG_ACTION_SQL_TO_UI = {
  buat: 'CREATE',
  ubah: 'UPDATE',
  terbit: 'PUBLISH',
  arsip: 'ARCHIVE',
  pulihkan: 'RESTORE',
  hapus: 'DELETE',
  masuk: 'LOGIN',
};

const LOG_ACTION_UI_TO_SQL = {
  CREATE: 'buat',
  UPDATE: 'ubah',
  PUBLISH: 'terbit',
  ARCHIVE: 'arsip',
  RESTORE: 'pulihkan',
  DELETE: 'hapus',
  LOGIN: 'masuk',
};

const LOG_ENTITY_SQL_TO_UI = {
  karya: 'Karya',
  pameran: 'Pameran',
  artikel: 'Artikel',
  pengaturan: 'Pengaturan Situs',
  pengguna: 'Pengguna',
  sesi: 'Sesi',
};

const LOG_ENTITY_UI_TO_SQL = {
  Karya: 'karya',
  Pameran: 'pameran',
  Artikel: 'artikel',
  'Pengaturan Situs': 'pengaturan',
  Pengaturan: 'pengaturan',
  Pengguna: 'pengguna',
  Sesi: 'sesi',
};

const AVAILABILITY_SQL_SET = new Set(['AVAILABLE', 'SOLD', 'PRIVATE_COLLECTION']);
const AVAILABILITY_ID_TO_SQL = {
  TERSEDIA: 'AVAILABLE',
  TERJUAL: 'SOLD',
  'KOLEKSI PRIBADI': 'PRIVATE_COLLECTION',
};

const EXHIBITION_TYPE_SQL_SET = new Set(['SOLO', 'GROUP']);
const EXHIBITION_TYPE_ID_TO_SQL = {
  'PAMERAN TUNGGAL': 'SOLO',
  'PAMERAN BERSAMA': 'GROUP',
};

// -----------------------------------------------------------------------------
// Helper Nilai, Dimensi, Titik Fokus & Tanggal
// -----------------------------------------------------------------------------

export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseDimensionsCm(dimStr) {
  const match = String(dimStr || '').match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (!match) return { widthCm: null, heightCm: null };
  return {
    widthCm: Number(match[1].replace(',', '.')),
    heightCm: Number(match[2].replace(',', '.')),
  };
}

export function formatDimensionsCm(widthCm, heightCm) {
  const w = Number(widthCm);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) return '—';
  return `${w} × ${h} cm`;
}

export function parseFocalPoint(focalStr) {
  const match = String(focalStr || '50% 35%').match(/(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!match) return { focalX: 50, focalY: 35 };
  return {
    focalX: Number(match[1]),
    focalY: Number(match[2]),
  };
}

export function formatFocalPoint(focalX = 50, focalY = 35) {
  const x = Number.isFinite(Number(focalX)) ? Number(focalX) : 50;
  const y = Number.isFinite(Number(focalY)) ? Number(focalY) : 35;
  return `${x}% ${y}%`;
}

export function toDateOnlyString(dateOrIso) {
  if (!dateOrIso) return '';
  const str = String(dateOrIso).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10);
  const dt = new Date(str);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

export function toIsoTimestamp(dateOrIso, fallbackIso = null) {
  if (!dateOrIso) return fallbackIso;
  const str = String(dateOrIso).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${str}T00:00:00.000Z`;
  const dt = new Date(str);
  if (Number.isNaN(dt.getTime())) return fallbackIso;
  return dt.toISOString();
}

export function normalizeAvailability(val) {
  const raw = String(val || 'AVAILABLE').trim().toUpperCase();
  if (AVAILABILITY_SQL_SET.has(raw)) return raw;
  return AVAILABILITY_ID_TO_SQL[raw] || 'AVAILABLE';
}

export function normalizeExhibitionType(val) {
  const raw = String(val || 'GROUP').trim().toUpperCase();
  if (EXHIBITION_TYPE_SQL_SET.has(raw)) return raw;
  return EXHIBITION_TYPE_ID_TO_SQL[raw] || 'GROUP';
}

function defaultResolveMediaUrl(pathOrUrl) {
  return pathOrUrl || '';
}

function mapChildImageFromRow(imgRow, resolveUrl = defaultResolveMediaUrl) {
  const pathWeb = imgRow.path_web ?? imgRow.url ?? '';
  const pathOriginal = imgRow.path_original ?? '';
  return {
    id: imgRow.id || '',
    url: imgRow.url || resolveUrl(pathWeb),
    pathWeb,
    pathOriginal,
    alt: imgRow.alt_text ?? imgRow.alt ?? '',
    caption: imgRow.caption ?? '',
    sortOrder: Number(imgRow.sort_order ?? imgRow.sortOrder ?? 0),
    isCover: Boolean(imgRow.is_cover ?? imgRow.isCover),
    width: imgRow.width_px != null ? Number(imgRow.width_px) : Number(imgRow.width || 0),
    height: imgRow.height_px != null ? Number(imgRow.height_px) : Number(imgRow.height || 0),
    ...(imgRow.focal_x != null || imgRow.focal_y != null
      ? { focalPoint: formatFocalPoint(imgRow.focal_x, imgRow.focal_y) }
      : {}),
  };
}

function mapChildImageToRow(img, idx, parentForeignKey, parentId, includeFocal = false) {
  const row = {
    ...(img.id ? { id: img.id } : {}),
    ...(parentId ? { [parentForeignKey]: parentId } : {}),
    path_original: img.pathOriginal || img.path_original || img.url || '',
    path_web: img.pathWeb || img.path_web || img.url || '',
    alt_text: img.alt || img.alt_text || '',
    caption: img.caption || null,
    sort_order: Number(img.sortOrder ?? img.sort_order ?? idx),
    is_cover: Boolean(img.isCover ?? img.is_cover ?? idx === 0),
    width_px: img.width ? Number(img.width) : null,
    height_px: img.height ? Number(img.height) : null,
  };

  if (includeFocal) {
    const { focalX, focalY } = parseFocalPoint(img.focalPoint);
    row.focal_x = img.focal_x != null ? Number(img.focal_x) : focalX;
    row.focal_y = img.focal_y != null ? Number(img.focal_y) : focalY;
  }

  return row;
}

// -----------------------------------------------------------------------------
// 1. ARTWORK MAPPER (artworks + artwork_images)
// -----------------------------------------------------------------------------
export const artworkMapper = {
  fromRow(row, options = {}) {
    if (!row) return null;
    const resolveUrl = options.resolveUrl || defaultResolveMediaUrl;
    const rawImages = Array.isArray(row.artwork_images)
      ? row.artwork_images
      : Array.isArray(row.images)
        ? row.images
        : [];

    const sortedImages = [...rawImages]
      .map((img) => mapChildImageFromRow(img, resolveUrl))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const coverImg = sortedImages.find((img) => img.isCover) || sortedImages[0] || null;
    const parsedFromDim = parseDimensionsCm(row.dimensions);
    const widthCm = row.width_cm != null ? Number(row.width_cm) : parsedFromDim.widthCm;
    const heightCm = row.height_cm != null ? Number(row.height_cm) : parsedFromDim.heightCm;
    const publishStatus = PUBLISH_SQL_TO_UI[row.status] || (row.isDraft ? 'DRAFT' : 'PUBLISHED');
    const publishedAt = row.published_at || row.publishedAt || null;

    return {
      id: row.id || '',
      slug: row.slug || '',
      title: row.title || '',
      year: Number(row.year) || new Date().getFullYear(),
      medium: row.medium || '',
      widthCm: widthCm ?? '',
      heightCm: heightCm ?? '',
      dimensions: row.dimensions || formatDimensionsCm(widthCm, heightCm),
      availability: normalizeAvailability(row.availability || row.status),
      description: row.description || '',
      studioNote: row.studio_note ?? row.studioNote ?? '',
      isFeatured: Boolean(row.is_featured ?? row.isFeatured),
      publishStatus,
      publishedAt,
      publishedDate: toDateOnlyString(publishedAt),
      coverImage: coverImg?.url || row.coverImage || null,
      coverImageAlt: coverImg?.alt || row.coverImageAlt || '',
      images: sortedImages,
      createdBy: row.created_by || null,
      updatedBy: row.updated_by || null,
      createdAt: row.created_at || row.createdAt || null,
      updatedAt: row.updated_at || row.updatedAt || null,
    };
  },

  toRow(model) {
    if (!model) return null;
    const parsedDim = parseDimensionsCm(model.dimensions);
    const widthCm =
      model.widthCm !== '' && model.widthCm != null ? Number(model.widthCm) : parsedDim.widthCm;
    const heightCm =
      model.heightCm !== '' && model.heightCm != null ? Number(model.heightCm) : parsedDim.heightCm;

    const sqlStatus =
      PUBLISH_UI_TO_SQL[model.publishStatus] || (model.isDraft ? 'draft' : 'published');
    const publishedAt =
      toIsoTimestamp(model.publishedAt || model.publishedDate) ||
      (sqlStatus === 'published' ? new Date().toISOString() : null);

    const rawImages =
      Array.isArray(model.images) && model.images.length > 0
        ? model.images
        : model.coverImage
          ? [
              {
                url: model.coverImage,
                alt: model.coverImageAlt || model.title || '',
                isCover: true,
                sortOrder: 0,
              },
            ]
          : [];

    return {
      ...(model.id ? { id: model.id } : {}),
      slug: model.slug || slugify(model.title),
      title: String(model.title || '').trim(),
      year: Number(model.year) || new Date().getFullYear(),
      medium: String(model.medium || '').trim(),
      width_cm: widthCm ?? 1,
      height_cm: heightCm ?? 1,
      availability: normalizeAvailability(model.availability || model.status),
      description: model.description || '',
      studio_note: model.studioNote ? String(model.studioNote) : null,
      is_featured: Boolean(model.isFeatured),
      status: sqlStatus,
      published_at: publishedAt,
      artwork_images: rawImages.map((img, idx) =>
        mapChildImageToRow(img, idx, 'artwork_id', model.id, false)
      ),
    };
  },
};

// -----------------------------------------------------------------------------
// 2. EXHIBITION MAPPER (exhibitions + exhibition_images)
// -----------------------------------------------------------------------------
export const exhibitionMapper = {
  fromRow(row, options = {}) {
    if (!row) return null;
    const resolveUrl = options.resolveUrl || defaultResolveMediaUrl;
    const rawImages = Array.isArray(row.exhibition_images)
      ? row.exhibition_images
      : Array.isArray(row.images)
        ? row.images
        : [];

    const sortedImages = [...rawImages]
      .map((img) => mapChildImageFromRow(img, resolveUrl))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const rawCover = rawImages.find((i) => i.is_cover || i.isCover) || rawImages[0];
    const coverImg = sortedImages.find((i) => i.isCover) || sortedImages[0] || null;
    const focalPoint =
      rawCover && (rawCover.focal_x != null || rawCover.focal_y != null)
        ? formatFocalPoint(rawCover.focal_x, rawCover.focal_y)
        : row.focalPoint || '50% 35%';

    const startDate = toDateOnlyString(row.start_date || row.startDate);
    const endDate = toDateOnlyString(row.end_date || row.endDate);
    const publishedAt = row.published_at || row.publishedAt || null;

    return {
      id: row.id || '',
      slug: row.slug || '',
      title: row.title || '',
      type: normalizeExhibitionType(row.exhibition_type || row.type),
      venue: row.venue || '',
      location: row.city ?? row.location ?? '',
      city: row.city ?? row.location ?? '',
      startDate,
      endDate,
      curator: row.curator_name ?? row.curator ?? '',
      description: row.description || row.curatorialNote || '',
      focalPoint,
      publishStatus: PUBLISH_SQL_TO_UI[row.status] || (row.isDraft ? 'DRAFT' : 'PUBLISHED'),
      publishedAt,
      publishedDate: toDateOnlyString(publishedAt),
      coverImage: coverImg?.url || row.coverImage || null,
      coverImageAlt: coverImg?.alt || row.coverImageAlt || '',
      images: sortedImages,
      createdBy: row.created_by || null,
      updatedBy: row.updated_by || null,
      createdAt: row.created_at || row.createdAt || null,
      updatedAt: row.updated_at || row.updatedAt || null,
    };
  },

  toRow(model) {
    if (!model) return null;
    const sqlStatus =
      PUBLISH_UI_TO_SQL[model.publishStatus] || (model.isDraft ? 'draft' : 'published');
    const publishedAt =
      toIsoTimestamp(model.publishedAt || model.publishedDate || model.startDate) ||
      (sqlStatus === 'published' ? new Date().toISOString() : null);

    const { focalX, focalY } = parseFocalPoint(model.focalPoint);
    const rawImages =
      Array.isArray(model.images) && model.images.length > 0
        ? model.images
        : model.coverImage
          ? [
              {
                url: model.coverImage,
                alt: model.coverImageAlt || model.title || '',
                isCover: true,
                sortOrder: 0,
              },
            ]
          : [];

    return {
      ...(model.id ? { id: model.id } : {}),
      slug: model.slug || slugify(model.title),
      title: String(model.title || '').trim(),
      exhibition_type: normalizeExhibitionType(model.type || model.exhibitionType),
      venue: String(model.venue || '').trim(),
      city: String(model.city || model.location || '').trim(),
      start_date: toDateOnlyString(model.startDate) || new Date().toISOString().slice(0, 10),
      end_date: toDateOnlyString(model.endDate) || null,
      curator_name: model.curator ? String(model.curator).trim() : null,
      description: model.description || model.curatorialNote || '',
      status: sqlStatus,
      published_at: publishedAt,
      exhibition_images: rawImages.map((img, idx) => {
        const enriched =
          idx === 0 && !img.focalPoint ? { ...img, focal_x: focalX, focal_y: focalY } : img;
        return mapChildImageToRow(enriched, idx, 'exhibition_id', model.id, true);
      }),
    };
  },
};

// -----------------------------------------------------------------------------
// 3. ARTICLE MAPPER (articles)
// -----------------------------------------------------------------------------
export const articleMapper = {
  fromRow(row, options = {}) {
    if (!row) return null;
    const resolveUrl = options.resolveUrl || defaultResolveMediaUrl;
    const pathWeb = row.cover_path_web ?? row.coverImage ?? '';
    const pathOriginal = row.cover_path_original ?? '';
    const coverUrl = row.coverImage || resolveUrl(pathWeb);
    const content = Array.isArray(row.content) && row.content.length > 0 ? [...row.content] : [''];
    const publishedAt = row.published_at || row.publishedAt || null;

    return {
      id: row.id || '',
      slug: row.slug || '',
      category: row.category || '',
      title: row.title || '',
      summary: row.summary || '',
      content,
      quote: row.quote ?? '',
      author: row.author_name ?? row.author ?? 'Husen Nursidik',
      place: row.place ?? '',
      readingMinutes: Number(row.reading_minutes ?? row.readingMinutes ?? 1),
      publishStatus: PUBLISH_SQL_TO_UI[row.status] || (row.isDraft ? 'DRAFT' : 'PUBLISHED'),
      publishedAt,
      publishedDate: toDateOnlyString(publishedAt),
      coverImage: coverUrl || null,
      coverImageAlt: row.cover_alt ?? row.coverImageAlt ?? '',
      images: coverUrl
        ? [
            {
              id: `${row.id || 'art'}-cover`,
              url: coverUrl,
              pathWeb,
              pathOriginal,
              alt: row.cover_alt ?? row.coverImageAlt ?? '',
              width: Number(row.cover_width_px ?? row.width ?? 0),
              height: Number(row.cover_height_px ?? row.height ?? 0),
              isCover: true,
            },
          ]
        : [],
      createdBy: row.created_by || null,
      updatedBy: row.updated_by || null,
      createdAt: row.created_at || row.createdAt || null,
      updatedAt: row.updated_at || row.updatedAt || null,
    };
  },

  toRow(model) {
    if (!model) return null;
    const cover = model.images?.[0] || null;
    const pathWeb = cover?.pathWeb || cover?.url || model.coverImage || null;
    const pathOriginal = cover?.pathOriginal || cover?.url || model.coverImage || null;
    const sqlStatus =
      PUBLISH_UI_TO_SQL[model.publishStatus] || (model.isDraft ? 'draft' : 'published');
    const publishedAt =
      toIsoTimestamp(model.publishedAt || model.publishedDate) ||
      (sqlStatus === 'published' ? new Date().toISOString() : null);

    return {
      ...(model.id ? { id: model.id } : {}),
      slug: model.slug || slugify(model.title),
      category: String(model.category || '').trim(),
      title: String(model.title || '').trim(),
      summary: String(model.summary || '').trim(),
      content: Array.isArray(model.content) ? [...model.content] : [],
      quote: model.quote ? String(model.quote) : null,
      author_name: String(model.author || 'Husen Nursidik').trim(),
      place: model.place ? String(model.place).trim() : null,
      reading_minutes: Math.max(1, Number(model.readingMinutes) || 1),
      cover_path_original: pathOriginal,
      cover_path_web: pathWeb,
      cover_alt: cover?.alt || model.coverImageAlt || null,
      cover_width_px: cover?.width ? Number(cover.width) : null,
      cover_height_px: cover?.height ? Number(cover.height) : null,
      status: sqlStatus,
      published_at: publishedAt,
    };
  },
};

// -----------------------------------------------------------------------------
// 4. SITE SETTINGS MAPPER (site_settings key/value jsonb)
// -----------------------------------------------------------------------------
const OWNER_ONLY_SETTING_KEYS = new Set(['report_ga4_url', 'report_looker_url']);

export const settingMapper = {
  fromRow(row) {
    if (!row) return null;
    return {
      key: row.key,
      value: row.value,
      ownerOnly: Boolean(row.owner_only),
      updatedBy: row.updated_by || null,
      updatedAt: row.updated_at || null,
    };
  },

  toRow(entry) {
    if (!entry) return null;
    return {
      key: entry.key,
      value: entry.value ?? '',
      owner_only: Boolean(entry.ownerOnly ?? OWNER_ONLY_SETTING_KEYS.has(entry.key)),
    };
  },

  fromRows(rows = [], options = {}) {
    const resolveUrl = options.resolveUrl || defaultResolveMediaUrl;
    const map = {};
    let latestAt = '';
    let latestBy = options.defaultUpdatedByName || 'Husen Nursidik';
    const profileNameById = options.profileNameById || {};

    for (const r of rows) {
      map[r.key] = r.value;
      if (r.updated_at && (!latestAt || new Date(r.updated_at) > new Date(latestAt))) {
        latestAt = r.updated_at;
        if (r.updated_by && profileNameById[r.updated_by]) {
          latestBy = profileNameById[r.updated_by];
        }
      }
    }

    const portraitPath = String(map.about_portrait_path || '');
    const stepsRaw = Array.isArray(map.custom_order_steps) ? map.custom_order_steps : [];

    return {
      contact: {
        whatsapp: String(map.contact_whatsapp || ''),
        email: String(map.contact_email || ''),
        instagram: String(map.contact_instagram || ''),
        facebook: String(map.contact_facebook || ''),
        locationNotes: String(map.studio_location_note || ''),
        copyrightText: String(map.copyright_text || ''),
      },
      pageContent: {
        heroQuote: String(map.hero_quote || ''),
        tentang: {
          biografi: String(map.about_bio || ''),
          filosofi: String(map.about_philosophy || ''),
          perjalanan: String(map.about_journey || ''),
          praktik: String(map.about_practice || ''),
          jenisKarya: String(map.about_work_types || ''),
          portraitPath,
          portraitUrl: portraitPath ? resolveUrl(portraitPath) : '',
          portraitAlt: String(map.about_portrait_alt || 'Husen Nursidik di Studio Lukis'),
        },
        customOrderSteps: stepsRaw.map((s, idx) => ({
          id: s.id || `co-0${idx + 1}`,
          stepNumber: s.stepNumber || String(idx + 1).padStart(2, '0'),
          title: String(s.title || ''),
          description: String(s.description || ''),
        })),
      },
      analytics: {
        ga4Url: String(map.report_ga4_url || ''),
        lookerEmbedUrl: String(map.report_looker_url || ''),
      },
      lastUpdatedBy: latestBy,
      lastUpdatedAt: latestAt || null,
    };
  },

  toRows(model) {
    if (!model) return [];
    const c = model.contact || {};
    const p = model.pageContent || {};
    const t = p.tentang || {};
    const a = model.analytics || {};

    const pairs = [
      ['contact_whatsapp', c.whatsapp || ''],
      ['contact_email', c.email || ''],
      ['contact_instagram', c.instagram || ''],
      ['contact_facebook', c.facebook || ''],
      ['studio_location_note', c.locationNotes || ''],
      ['copyright_text', c.copyrightText || ''],
      ['hero_quote', p.heroQuote || ''],
      ['about_bio', t.biografi || ''],
      ['about_philosophy', t.filosofi || ''],
      ['about_journey', t.perjalanan || ''],
      ['about_practice', t.praktik || ''],
      ['about_work_types', t.jenisKarya || ''],
      ['about_portrait_path', t.portraitPath || t.portraitUrl || ''],
      [
        'custom_order_steps',
        (Array.isArray(p.customOrderSteps) ? p.customOrderSteps : []).map((s, idx) => ({
          id: s.id || `co-0${idx + 1}`,
          stepNumber: s.stepNumber || String(idx + 1).padStart(2, '0'),
          title: String(s.title || ''),
          description: String(s.description || ''),
        })),
      ],
      ['report_ga4_url', a.ga4Url || ''],
      ['report_looker_url', a.lookerEmbedUrl || ''],
    ];

    return pairs.map(([key, value]) => ({
      key,
      value,
      owner_only: OWNER_ONLY_SETTING_KEYS.has(key),
    }));
  },
};

// -----------------------------------------------------------------------------
// 5. PROFILE / PENGGUNA MAPPER (profiles)
// -----------------------------------------------------------------------------
export const profileMapper = {
  fromRow(row) {
    if (!row) return null;
    const isActive = row.is_active !== false;
    const status = !isActive ? 'INACTIVE' : row.last_login_at ? 'ACTIVE' : 'PENDING';
    return {
      id: row.id || '',
      name: row.name || '',
      email: row.email || '',
      role: ROLE_SQL_TO_UI[row.role] || String(row.role || 'admin').toUpperCase(),
      isActive,
      status,
      lastLoginAt: row.last_login_at || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null,
    };
  },

  toRow(model) {
    if (!model) return null;
    const isActive = model.status ? model.status !== 'INACTIVE' : model.isActive !== false;
    return {
      ...(model.id ? { id: model.id } : {}),
      name: String(model.name || '').trim(),
      email: String(model.email || '').trim().toLowerCase(),
      role: ROLE_UI_TO_SQL[model.role] || (String(model.role).toLowerCase() === 'owner' ? 'owner' : 'admin'),
      is_active: Boolean(isActive),
      last_login_at: model.lastLoginAt || null,
    };
  },
};

// -----------------------------------------------------------------------------
// 6. ACTIVITY LOG MAPPER (activity_logs)
// -----------------------------------------------------------------------------
export const activityLogMapper = {
  fromRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id || null,
      userName: row.user_name || 'Sistem',
      userRole: row.user_role || '',
      action: LOG_ACTION_SQL_TO_UI[row.action] || String(row.action || 'ubah').toUpperCase(),
      itemType: LOG_ENTITY_SQL_TO_UI[row.entity] || row.entity || 'Karya',
      entityId: row.entity_id || null,
      itemTitle: row.entity_title || (row.entity === 'sesi' ? 'Panel Studio' : ''),
      timestamp: row.created_at || null,
    };
  },

  toRow(model) {
    if (!model) return null;
    return {
      ...(model.id != null ? { id: model.id } : {}),
      user_id: model.userId || null,
      user_name: model.userName || 'Sistem',
      action: LOG_ACTION_UI_TO_SQL[model.action] || 'ubah',
      entity: LOG_ENTITY_UI_TO_SQL[model.itemType] || 'karya',
      entity_id: model.entityId || null,
      entity_title: model.itemTitle || null,
      ...(model.timestamp ? { created_at: toIsoTimestamp(model.timestamp) } : {}),
    };
  },
};

