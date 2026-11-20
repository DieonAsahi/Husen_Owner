import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConfirm, useToast } from '../context/adminContexts';
import { getArtworkStatus } from '../../utils/labelMap';
import {
  getArtworkAdminBySlug,
  saveArtworkAdmin,
  slugifyText,
  formatDimensionsText,
} from '../services/adminContentStore';
import { mapPublishBadge } from '../services/adminApi';
import StatusDot from '../components/StatusDot';
import AdminSlugField from '../components/AdminSlugField';
import MediumCombobox from '../components/MediumCombobox';
import AdminPhotoManager from '../components/AdminPhotoManager';

const MAX_DESC_CHARS = 1200;

function createEmptyKarya() {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: '',
    title: '',
    slug: '',
    year: String(new Date().getFullYear()),
    medium: '',
    widthCm: '',
    heightCm: '',
    description: '',
    studioNote: '',
    publishStatus: 'DRAFT',
    publishedDate: today,
    availability: 'AVAILABLE',
    isFeatured: false,
    images: [],
  };
}

export default function AdminKaryaForm() {
  const { slug } = useParams();
  const isNew = !slug || slug === 'baru';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const stateOverride = import.meta.env.DEV ? searchParams.get('state') : null;

  const [loadState, setLoadState] = useState({
    status: isNew && stateOverride !== 'loading' && stateOverride !== 'error' ? 'ready' : 'loading',
    error: '',
    wasPublishedInitially: false,
  });

  const [form, setForm] = useState(createEmptyKarya);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [showAltValidation, setShowAltValidation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stateOverride === 'loading') return undefined;
    if (stateOverride === 'error') {
      const timer = window.setTimeout(() => {
        setLoadState({
          status: 'error',
          error: 'Gagal memuat data karya. Periksa koneksi Anda dan coba kembali.',
          wasPublishedInitially: false,
        });
      }, 150);
      return () => window.clearTimeout(timer);
    }
    if (isNew) return undefined;

    let cancelled = false;
    getArtworkAdminBySlug(slug).then((item) => {
      if (cancelled) return;
      if (!item) {
        setLoadState({
          status: 'error',
          error: `Karya dengan slug "${slug}" tidak ditemukan.`,
          wasPublishedInitially: false,
        });
        return;
      }
      setForm({
        ...item,
        year: String(item.year || ''),
        widthCm: String(item.widthCm || ''),
        heightCm: String(item.heightCm || ''),
      });
      setSlugManuallyEdited(true);
      setIsDirty(false);
      setLoadState({
        status: 'ready',
        error: '',
        wasPublishedInitially: item.publishStatus === 'PUBLISHED',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [slug, isNew, stateOverride]);

  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const updateField = (key, val) => {
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === 'title' && !slugManuallyEdited && !loadState.wasPublishedInitially) {
        next.slug = slugifyText(val);
      }
      return next;
    });
  };

  const validate = (targetStatus) => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Judul karya wajib diisi.';
    const cleanSlug = slugifyText(form.slug);
    if (!cleanSlug) {
      errs.slug = 'Slug wajib diisi.';
    } else if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      errs.slug = 'Gunakan huruf kecil, angka, dan tanda hubung (-) saja.';
    }

    const yearNum = Number(form.year);
    if (!form.year || Number.isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      errs.year = 'Masukkan tahun yang valid (misal 2026).';
    }

    if (targetStatus === 'PUBLISHED') {
      if (!form.medium.trim()) errs.medium = 'Medium karya wajib diisi.';
      if (!form.widthCm || Number(form.widthCm) <= 0) errs.widthCm = 'Lebar (cm) wajib diisi.';
      if (!form.heightCm || Number(form.heightCm) <= 0) errs.heightCm = 'Tinggi (cm) wajib diisi.';
      if (!form.description.trim()) errs.description = 'Deskripsi karya wajib diisi sebelum diterbitkan.';
    }

    if (form.description.length > MAX_DESC_CHARS) {
      errs.description = `Deskripsi maksimal ${MAX_DESC_CHARS} karakter.`;
    }

    const hasMissingAlt = (form.images || []).some((img) => !String(img.alt || '').trim());
    if (targetStatus === 'PUBLISHED' && hasMissingAlt) {
      errs.photos = 'Setiap foto harus memiliki teks alternatif.';
    }

    return errs;
  };

  const handleSave = async (targetPublishStatus) => {
    if (saving) return;
    setShowAltValidation(targetPublishStatus === 'PUBLISHED');

    const errs = validate(targetPublishStatus);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast({
        message: 'Periksa kembali kolom yang masih belum lengkap.',
        tone: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await saveArtworkAdmin({
        ...form,
        publishStatus: targetPublishStatus,
      });
      setIsDirty(false);
      setForm({
        ...saved,
        year: String(saved.year),
        widthCm: String(saved.widthCm),
        heightCm: String(saved.heightCm),
      });
      setLoadState((prev) => ({
        ...prev,
        wasPublishedInitially: saved.publishStatus === 'PUBLISHED',
      }));
      showToast({
        message:
          targetPublishStatus === 'PUBLISHED'
            ? `"${saved.title}" berhasil diterbitkan.`
            : `"${saved.title}" disimpan sebagai draft.`,
        tone: 'success',
      });
      if (isNew || saved.slug !== slug) {
        navigate(`/karya/${saved.slug}`, { replace: true });
      }
    } catch (err) {
      showToast({
        message: err?.message || 'Gagal menyimpan karya.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = async (e) => {
    if (!isDirty) return;
    e.preventDefault();
    const ok = await confirm({
      title: 'Tinggalkan perubahan?',
      message: 'Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar dari formulir ini?',
      confirmLabel: 'Ya, Tinggalkan',
      cancelLabel: 'Lanjutkan Menyunting',
      destructive: true,
    });
    if (ok) navigate('/karya');
  };

  const handlePreview = () => {
    const cleanSlug = slugifyText(form.slug);
    if (!form.id || !cleanSlug) {
      showToast({
        message: 'Simpan sebagai draft terlebih dahulu sebelum membuka pratinjau.',
        tone: 'warning',
      });
      return;
    }
    window.open(`/karya/${cleanSlug}`, '_blank', 'noopener,noreferrer');
  };

  const stampInfo = getArtworkStatus(form.availability);
  const pubBadge = mapPublishBadge(form.publishStatus);
  const sizePreview = formatDimensionsText(form.widthCm, form.heightCm);

  if (loadState.status === 'loading') {
    return (
      <div className="admin-form-page">
        <div className="admin-form-top">
          <Link to="/karya" className="admin-text-link">← Daftar Karya</Link>
        </div>
        <div className="admin-panel">
          <div className="admin-skeleton-rows">
            <div className="admin-skeleton admin-skeleton--title" />
            <div className="admin-skeleton admin-skeleton--label" />
            <div className="admin-skeleton admin-skeleton--meta" />
          </div>
        </div>
      </div>
    );
  }

  if (loadState.status === 'error') {
    return (
      <div className="admin-form-page">
        <div className="admin-form-top">
          <Link to="/karya" className="admin-text-link">← Daftar Karya</Link>
        </div>
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT KARYA" tone="danger" />
            <p className="admin-state-box__msg">{loadState.error}</p>
            <Link to="/karya" className="admin-btn admin-btn--secondary">
              ← Kembali ke Daftar Karya
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-form-page admin-form-page--has-sticky">
      <div className="admin-form-top">
        <div className="admin-form-top__left">
          <Link to="/karya" className="admin-text-link" onClick={handleBackClick}>
            ← Daftar Karya
          </Link>
          <h2 className="admin-form-top__title">
            {isNew ? 'Tambah Karya' : form.title || 'Sunting Karya'}
          </h2>
        </div>

        {isDirty && (
          <StatusDot label="Perubahan belum disimpan" tone="warning" />
        )}
      </div>

      <form
        className="admin-two-col"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(form.publishStatus === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');
        }}
        noValidate
      >
        {/* KOLOM UTAMA */}
        <div className="admin-form-main">
          <section className="admin-panel admin-panel--padded">
            <div className="admin-form">
              <div className="admin-field">
                <label htmlFor="karya-title" className="admin-label">
                  Judul karya
                </label>
                <input
                  id="karya-title"
                  type="text"
                  className={`admin-input ${errors.title ? 'is-error' : ''}`}
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'karya-title-err' : undefined}
                />
                {errors.title && (
                  <p id="karya-title-err" className="admin-field__error" role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              <AdminSlugField
                id="karya-slug"
                value={form.slug}
                basePrefix="/karya/"
                isPublishedInitially={loadState.wasPublishedInitially}
                error={errors.slug}
                onChange={(val) => {
                  setSlugManuallyEdited(true);
                  updateField('slug', slugifyText(val));
                }}
              />

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="karya-year" className="admin-label">
                    Tahun
                  </label>
                  <input
                    id="karya-year"
                    type="number"
                    min="1900"
                    max="2100"
                    className={`admin-input ${errors.year ? 'is-error' : ''}`}
                    value={form.year}
                    onChange={(e) => updateField('year', e.target.value)}
                    aria-invalid={Boolean(errors.year)}
                    aria-describedby={errors.year ? 'karya-year-err' : undefined}
                  />
                  {errors.year && (
                    <p id="karya-year-err" className="admin-field__error" role="alert">
                      {errors.year}
                    </p>
                  )}
                </div>

                <MediumCombobox
                  id="karya-medium"
                  value={form.medium}
                  error={errors.medium}
                  onChange={(val) => updateField('medium', val)}
                />
              </div>

              <div className="admin-dimensions-block">
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label htmlFor="karya-width" className="admin-label">
                      Lebar (cm)
                    </label>
                    <input
                      id="karya-width"
                      type="number"
                      min="1"
                      step="any"
                      className={`admin-input ${errors.widthCm ? 'is-error' : ''}`}
                      value={form.widthCm}
                      onChange={(e) => updateField('widthCm', e.target.value)}
                      aria-invalid={Boolean(errors.widthCm)}
                      aria-describedby={errors.widthCm ? 'karya-w-err' : undefined}
                    />
                    {errors.widthCm && (
                      <p id="karya-w-err" className="admin-field__error" role="alert">
                        {errors.widthCm}
                      </p>
                    )}
                  </div>

                  <div className="admin-field">
                    <label htmlFor="karya-height" className="admin-label">
                      Tinggi (cm)
                    </label>
                    <input
                      id="karya-height"
                      type="number"
                      min="1"
                      step="any"
                      className={`admin-input ${errors.heightCm ? 'is-error' : ''}`}
                      value={form.heightCm}
                      onChange={(e) => updateField('heightCm', e.target.value)}
                      aria-invalid={Boolean(errors.heightCm)}
                      aria-describedby={errors.heightCm ? 'karya-h-err' : undefined}
                    />
                    {errors.heightCm && (
                      <p id="karya-h-err" className="admin-field__error" role="alert">
                        {errors.heightCm}
                      </p>
                    )}
                  </div>
                </div>
                <p className="admin-field__help">
                  Pratinjau ukuran: <strong>{sizePreview}</strong>
                </p>
              </div>

              <div className="admin-field">
                <div className="admin-label-row">
                  <label htmlFor="karya-desc" className="admin-label">
                    Deskripsi
                  </label>
                  <span className={`admin-char-count ${form.description.length > MAX_DESC_CHARS ? 'is-over' : ''}`}>
                    {form.description.length} / {MAX_DESC_CHARS}
                  </span>
                </div>
                <textarea
                  id="karya-desc"
                  rows={5}
                  className={`admin-textarea ${errors.description ? 'is-error' : ''}`}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? 'karya-desc-err' : undefined}
                />
                {errors.description && (
                  <p id="karya-desc-err" className="admin-field__error" role="alert">
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="admin-field">
                <label htmlFor="karya-note" className="admin-label">
                  Catatan studio (opsional)
                </label>
                <input
                  id="karya-note"
                  type="text"
                  className="admin-input"
                  value={form.studioNote}
                  onChange={(e) => updateField('studioNote', e.target.value)}
                />
              </div>
            </div>
          </section>
        </div>

        {/* KOLOM SAMPING */}
        <aside className="admin-form-side">
          {/* Panel Publikasi */}
          <section className="admin-panel">
            <div className="admin-panel__head admin-panel__head--split">
              <h3 className="admin-panel__subhead">Publikasi</h3>
              <StatusDot label={pubBadge.label} tone={pubBadge.tone} />
            </div>
            <div className="admin-side-body">
              <div className="admin-field">
                <label htmlFor="karya-pub-status" className="admin-label">
                  Status publikasi
                </label>
                <select
                  id="karya-pub-status"
                  className="admin-select"
                  value={form.publishStatus}
                  onChange={(e) => updateField('publishStatus', e.target.value)}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Terbit</option>
                  <option value="ARCHIVED">Diarsipkan</option>
                </select>
              </div>

              <div className="admin-field">
                <label htmlFor="karya-pub-date" className="admin-label">
                  Tanggal terbit
                </label>
                <input
                  id="karya-pub-date"
                  type="date"
                  className="admin-input"
                  value={form.publishedDate}
                  onChange={(e) => updateField('publishedDate', e.target.value)}
                />
              </div>

              <div className="admin-side-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--full"
                  disabled={saving}
                  onClick={() => handleSave('DRAFT')}
                >
                  Simpan Draft
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--full"
                  disabled={saving}
                  onClick={() => handleSave('PUBLISHED')}
                >
                  {saving ? 'Menyimpan...' : 'Terbitkan'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--full"
                  onClick={handlePreview}
                >
                  Pratinjau ↗
                </button>
              </div>
            </div>
          </section>

          {/* Panel Ketersediaan & Pratinjau Stempel */}
          <section className="admin-panel">
            <div className="admin-panel__head">
              <h3 className="admin-panel__subhead">Ketersediaan</h3>
            </div>
            <div className="admin-side-body">
              <div className="admin-radio-list" role="radiogroup" aria-label="Status ketersediaan karya">
                {[
                  { value: 'AVAILABLE', label: 'Tersedia', tone: 'success' },
                  { value: 'SOLD', label: 'Terjual', tone: 'danger' },
                  { value: 'PRIVATE_COLLECTION', label: 'Koleksi Pribadi', tone: 'neutral' },
                ].map((opt) => (
                  <label key={opt.value} className="admin-radio-option">
                    <input
                      type="radio"
                      name="karya-availability"
                      value={opt.value}
                      checked={form.availability === opt.value}
                      onChange={() => updateField('availability', opt.value)}
                    />
                    <StatusDot label={opt.label} tone={opt.tone} />
                  </label>
                ))}
              </div>

              {stampInfo && (
                <div className="admin-stamp-preview-box">
                  <span className="admin-field__help">Pratinjau stempel situs</span>
                  <div className="admin-stamp-stage">
                    <span
                      className="admin-stamp-live"
                      style={{
                        color: stampInfo.color,
                        borderColor: stampInfo.border,
                      }}
                    >
                      {stampInfo.label}
                    </span>
                  </div>
                </div>
              )}

              <label className="admin-checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(form.isFeatured)}
                  onChange={(e) => updateField('isFeatured', e.target.checked)}
                />
                <span>Karya unggulan</span>
              </label>
            </div>
          </section>
        </aside>

        {/* BAGIAN FOTO (LEBAR PENUH) */}
        <div className="admin-form-full">
          {errors.photos && (
            <p className="admin-field__error admin-mb-sm" role="alert">
              {errors.photos}
            </p>
          )}
          <AdminPhotoManager
            photos={form.images}
            onChange={(nextPhotos) => {
              setIsDirty(true);
              setErrors((prev) => ({ ...prev, photos: '' }));
              setForm((prev) => ({ ...prev, images: nextPhotos }));
            }}
            showAltValidation={showAltValidation}
          />
        </div>
      </form>

      {/* Bilah Aksi Menempel di Bawah pada Ponsel */}
      <div className="admin-sticky-bar">
        {isDirty && (
          <div className="admin-sticky-bar__status">
            <StatusDot label="Perubahan belum disimpan" tone="warning" />
          </div>
        )}
        <div className="admin-sticky-bar__btns">
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            disabled={saving}
            onClick={() => handleSave('DRAFT')}
          >
            Simpan Draft
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={saving}
            onClick={() => handleSave('PUBLISHED')}
          >
            Terbitkan
          </button>
        </div>
      </div>
    </div>
  );
}

