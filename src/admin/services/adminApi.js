import {
  getKaryaStoreSnapshot,
  getPameranStoreSnapshot,
} from './adminContentStore';
import { getArtikelStoreSnapshot } from './adminStudioStore';

const NOW_REFERENCE = () => Date.now();

export function formatRelativeTimeId(isoDate) {
  if (!isoDate) return '—';
  const dateMs = new Date(isoDate).getTime();
  if (Number.isNaN(dateMs)) return '—';

  const diffSec = Math.max(0, Math.floor((NOW_REFERENCE() - dateMs) / 1000));
  if (diffSec < 60) return 'Baru saja';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffDay < 30) return `${diffWeek} minggu lalu`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} bulan lalu`;

  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} tahun lalu`;
}

export function mapPublishBadge(publishStatus) {
  if (publishStatus === 'PUBLISHED') return { label: 'TERBIT', tone: 'success' };
  if (publishStatus === 'ARCHIVED') return { label: 'DIARSIPKAN', tone: 'neutral' };
  return { label: 'DRAFT', tone: 'neutral' };
}

export function mapAvailabilityBadge(availability) {
  if (availability === 'SOLD') return { label: 'TERJUAL', tone: 'danger' };
  if (availability === 'PRIVATE_COLLECTION') return { label: 'KOLEKSI PRIBADI', tone: 'neutral' };
  return { label: 'TERSEDIA', tone: 'success' };
}

function checkImageAttention(entity, jenisLabel, editPath) {
  const issues = [];
  const images = Array.isArray(entity.images) ? entity.images : [];
  const hasAnyImage = Boolean(entity.coverImage) || images.length > 0;

  if (jenisLabel === 'Karya' && !hasAnyImage) {
    issues.push({
      id: `${entity.id}-no-photo`,
      title: entity.title,
      jenis: jenisLabel,
      issue: 'Karya tanpa foto',
      detail: 'Belum ada gambar yang diunggah untuk karya ini',
      tone: 'danger',
      fixPath: editPath,
    });
    return issues;
  }

  const missingCoverAlt = Boolean(entity.coverImage) && !String(entity.coverImageAlt || '').trim();
  const missingGalleryAltCount = images.filter((img) => !String(img.alt || '').trim()).length;

  if (missingCoverAlt || missingGalleryAltCount > 0) {
    issues.push({
      id: `${entity.id}-missing-alt`,
      title: entity.title,
      jenis: jenisLabel,
      issue: 'Foto tanpa teks alternatif',
      detail: 'Deskripsi alt gambar diperlukan untuk aksesibilitas',
      tone: 'warning',
      fixPath: editPath,
    });
  }

  const lowResPhotos = images.filter((img) => Number(img.width) > 0 && Number(img.width) < 800);
  if (lowResPhotos.length > 0) {
    const minImg = lowResPhotos.reduce(
      (smallest, img) => (Number(img.width) < Number(smallest.width) ? img : smallest),
      lowResPhotos[0]
    );
    const dims = `${minImg.width} × ${minImg.height || '?'} px`;
    issues.push({
      id: `${entity.id}-low-res`,
      title: entity.title,
      jenis: jenisLabel,
      issue: 'Foto beresolusi rendah',
      detail: `Lebar ${dims} (disarankan ≥ 800 px)`,
      tone: 'warning',
      fixPath: editPath,
    });
  }

  const isDraft = entity.publishStatus === 'DRAFT' || Boolean(entity.isDraft || entity.status === 'DRAFT');
  const updatedMs = new Date(entity.updatedAt || entity.publishedAt || entity.startDate || 0).getTime();
  const ageDays = updatedMs > 0 ? Math.floor((NOW_REFERENCE() - updatedMs) / (1000 * 60 * 60 * 24)) : 0;
  if (isDraft && ageDays > 14) {
    issues.push({
      id: `${entity.id}-stale-draft`,
      title: entity.title,
      jenis: jenisLabel,
      issue: 'Draft lebih dari 14 hari',
      detail: `Disimpan sebagai draft selama ${ageDays} hari`,
      tone: 'neutral',
      fixPath: editPath,
    });
  }

  return issues;
}

export async function getDashboardSummary({ simulateState = null } = {}) {
  await new Promise((resolve) => window.setTimeout(resolve, 260));

  if (simulateState === 'error') {
    throw new Error('Gagal memuat ringkasan dashboard dari server. Silakan coba lagi.');
  }

  if (simulateState === 'empty') {
    return {
      counts: {
        karyaPublished: 0,
        pameranPublished: 0,
        artikelPublished: 0,
        draftWaiting: 0,
      },
      recentChanges: [],
      attentionItems: [],
    };
  }

  const artworks = getKaryaStoreSnapshot();
  const exhibitions = getPameranStoreSnapshot();
  const articles = getArtikelStoreSnapshot();

  const karyaPublished = artworks.filter((k) => k.publishStatus === 'PUBLISHED').length;
  const pameranPublished = exhibitions.filter((p) => p.publishStatus === 'PUBLISHED').length;
  const artikelPublished = articles.filter((a) => a.publishStatus === 'PUBLISHED').length;
  const draftWaiting =
    artworks.filter((k) => k.publishStatus === 'DRAFT').length +
    exhibitions.filter((p) => p.publishStatus === 'DRAFT').length +
    articles.filter((a) => a.publishStatus === 'DRAFT').length;

  const unified = [
    ...artworks.map((item) => ({
      id: item.id,
      title: item.title,
      jenis: 'Karya',
      status: item.publishStatus === 'DRAFT' ? mapPublishBadge('DRAFT') : mapAvailabilityBadge(item.availability),
      timestamp: item.updatedAt,
      editPath: `/karya/${item.slug}`,
    })),
    ...exhibitions.map((item) => ({
      id: item.id,
      title: item.title,
      jenis: 'Pameran',
      status: mapPublishBadge(item.publishStatus),
      timestamp: item.updatedAt,
      editPath: `/pameran/${item.slug}`,
    })),
    ...articles.map((item) => ({
      id: item.id,
      title: item.title,
      jenis: 'Artikel',
      status: mapPublishBadge(item.publishStatus),
      timestamp: item.updatedAt || item.publishedDate,
      editPath: `/artikel/${item.slug}`,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
    .slice(0, 5)
    .map((entry) => ({
      ...entry,
      relativeTime: formatRelativeTimeId(entry.timestamp),
    }));

  const attentionItems = [
    ...artworks.flatMap((k) => checkImageAttention(k, 'Karya', `/karya/${k.slug}`)),
    ...exhibitions.flatMap((p) => checkImageAttention(p, 'Pameran', `/pameran/${p.slug}`)),
    ...articles.flatMap((a) => checkImageAttention(a, 'Artikel', `/artikel/${a.slug}`)),
  ];

  return {
    counts: {
      karyaPublished,
      pameranPublished,
      artikelPublished,
      draftWaiting,
    },
    recentChanges: unified,
    attentionItems,
  };
}
