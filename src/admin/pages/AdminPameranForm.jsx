import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConfirm, useToast } from '../context/adminContexts';
import {
  getExhibitionAdminBySlug,
  saveExhibitionAdmin,
  slugifyText,
} from '../services/adminContentStore';
import { mapPublishBadge } from '../services/adminApi';
import StatusDot from '../components/StatusDot';
import AdminSlugField from '../components/AdminSlugField';
import AdminPhotoManager from '../components/AdminPhotoManager';

const MAX_NOTE_CHARS = 1200;

function createEmptyPameran() {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: '',
    title: '',
    slug: '',
    type: 'SOLO',
    venue: '',
    location: '',
    startDate: today,
    endDate: '',
    curator: '',
    description: '',
    publishStatus: 'DRAFT',
    publishedDate: today,
    focalPoint: '50% 35%',
    images: [],
  };
}

export default function AdminPameranForm() {
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

  const [form, setForm] = useState(createEmptyPameran);
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
          error: 'Gagal memuat data pameran. Periksa koneksi Anda dan coba kembali.',
          wasPublishedInitially: false,
        });
      }, 150);
      return () => window.clearTimeout(timer);
    }
    if (isNew) return undefined;

    let cancelled = false;
    getExhibitionAdminBySlug(slug).then((item) => {
      if (cancelled) return;
      if (!item) {
        setLoadState({
          status: 'error',
          error: `Pameran dengan slug "${slug}" tidak ditemukan.`,
          wasPublishedInitially: false,
        });
        return;
      }
      setForm(item);
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
    if (!form.title.trim()) errs.title = 'Judul pameran wajib diisi.';
    const cleanSlug = slugifyText(form.slug);
    if (!cleanSlug) {
      errs.slug = 'Slug wajib diisi.';
    } else if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      errs.slug = 'Gunakan huruf kecil, angka, dan tanda hubung (-) saja.';
    }

    if (targetStatus === 'PUBLISHED') {
      if (!form.venue.trim()) errs.venue = 'Nama venue wajib diisi.';
      if (!form.location.trim()) errs.location = 'Kota/lokasi pameran wajib diisi.';
      if (!form.startDate) errs.startDate = 'Tanggal mulai wajib diisi.';
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = 'Tanggal selesai tidak boleh mendahului tanggal mulai.';
    }

    if (form.description.length > MAX_NOTE_CHARS) {
      errs.description = `Catatan pameran maksimal ${MAX_NOTE_CHARS} karakter.`;
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
      const saved = await saveExhibitionAdmin({
        ...form,
        publishStatus: targetPublishStatus,
      });
      setIsDirty(false);
      setForm(saved);
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
        navigate(`/pameran/${saved.slug}`, { replace: true });
      }
    } catch (err) {
      showToast({
        message: err?.message || 'Gagal menyimpan pameran.',
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
    if (ok) navigate('/pameran');
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
    window.open(`/pameran/${cleanSlug}`, '_blank', 'noopener,noreferrer');
  };

  const pubBadge = mapPublishBadge(form.publishStatus);

  if (loadState.status === 'loading') {
    return (
      <div className="admin-form-page">
        <div className="admin-form-top">
          <Link to="/pameran" className="admin-text-link">← Daftar Pameran</Link>
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
          <Link to="/pameran" className="admin-text-link">← Daftar Pameran</Link>
        </div>
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT PAMERAN" tone="danger" />
            <p className="admin-state-box__msg">{loadState.error}</p>
            <Link to="/pameran" className="admin-btn admin-btn--secondary">
              ← Kembali ke Daftar Pameran
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
          <Link to="/pameran" className="admin-text-link" onClick={handleBackClick}>
            ← Daftar Pameran
          </Link>
          <h2 className="admin-form-top__title">
            {isNew ? 'Tambah Pameran' : form.title || 'Sunting Pameran'}
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
                <label htmlFor="pameran-title" className="admin-label">
                  Judul pameran
                </label>
                <input
                  id="pameran-title"
                  type="text"
                  className={`admin-input ${errors.title ? 'is-error' : ''}`}
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'pameran-title-err' : undefined}
                />
                {errors.title && (
                  <p id="pameran-title-err" className="admin-field__error" role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              <AdminSlugField
                id="pameran-slug"
                value={form.slug}
                basePrefix="/pameran/"
                isPublishedInitially={loadState.wasPublishedInitially}
                error={errors.slug}
                onChange={(val) => {
                  setSlugManuallyEdited(true);
                  updateField('slug', slugifyText(val));
                }}
              />

              {/* Segmen Jenis Pameran */}
              <div className="admin-field">
                <span className="admin-label" id="pameran-type-label">
                  Jenis pameran
                </span>
                <div className="admin-segmented" role="radiogroup" aria-labelledby="pameran-type-label">
                  {[
                    { value: 'SOLO', label: 'Pameran Tunggal' },
                    { value: 'GROUP', label: 'Pameran Bersama' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={form.type === opt.value}
                      className={`admin-segmented__btn ${form.type === opt.value ? 'is-active' : ''}`}
                      onClick={() => updateField('type', opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="pameran-venue" className="admin-label">
                    Venue / Galeri
                  </label>
                  <input
                    id="pameran-venue"
                    type="text"
                    className={`admin-input ${errors.venue ? 'is-error' : ''}`}
                    value={form.venue}
                    onChange={(e) => updateField('venue', e.target.value)}
                    aria-invalid={Boolean(errors.venue)}
                    aria-describedby={errors.venue ? 'pameran-venue-err' : undefined}
                  />
                  {errors.venue && (
                    <p id="pameran-venue-err" className="admin-field__error" role="alert">
                      {errors.venue}
                    </p>
                  )}
                </div>

                <div className="admin-field">
                  <label htmlFor="pameran-kota" className="admin-label">
                    Kota / Lokasi
                  </label>
                  <input
                    id="pameran-kota"
                    type="text"
                    className={`admin-input ${errors.location ? 'is-error' : ''}`}
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? 'pameran-kota-err' : undefined}
                  />
                  {errors.location && (
                    <p id="pameran-kota-err" className="admin-field__error" role="alert">
                      {errors.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="pameran-start" className="admin-label">
                    Tanggal mulai
                  </label>
                  <input
                    id="pameran-start"
                    type="date"
                    className={`admin-input ${errors.startDate ? 'is-error' : ''}`}
                    value={form.startDate}
                    onChange={(e) => updateField('startDate', e.target.value)}
                    aria-invalid={Boolean(errors.startDate)}
                    aria-describedby={errors.startDate ? 'pameran-start-err' : undefined}
                  />
                  {errors.startDate && (
                    <p id="pameran-start-err" className="admin-field__error" role="alert">
                      {errors.startDate}
                    </p>
                  )}
                </div>

                <div className="admin-field">
                  <label htmlFor="pameran-end" className="admin-label">
                    Tanggal selesai (opsional)
                  </label>
                  <input
                    id="pameran-end"
                    type="date"
                    className={`admin-input ${errors.endDate ? 'is-error' : ''}`}
                    value={form.endDate}
                    onChange={(e) => updateField('endDate', e.target.value)}
                    aria-invalid={Boolean(errors.endDate)}
                    aria-describedby={errors.endDate ? 'pameran-end-err' : undefined}
                  />
                  {errors.endDate && (
                    <p id="pameran-end-err" className="admin-field__error" role="alert">
                      {errors.endDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="admin-field">
                <label htmlFor="pameran-curator" className="admin-label">
                  Kurator (opsional)
                </label>
                <input
                  id="pameran-curator"
                  type="text"
                  className="admin-input"
                  value={form.curator}
                  onChange={(e) => updateField('curator', e.target.value)}
                />
              </div>

              <div className="admin-field">
                <div className="admin-label-row">
                  <label htmlFor="pameran-desc" className="admin-label">
                    Catatan pameran
                  </label>
                  <span className={`admin-char-count ${form.description.length > MAX_NOTE_CHARS ? 'is-over' : ''}`}>
                    {form.description.length} / {MAX_NOTE_CHARS}
                  </span>
                </div>
                <textarea
                  id="pameran-desc"
                  rows={5}
                  className={`admin-textarea ${errors.description ? 'is-error' : ''}`}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? 'pameran-desc-err' : undefined}
                />
                {errors.description && (
                  <p id="pameran-desc-err" className="admin-field__error" role="alert">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* KOLOM SAMPING (HANYA PANEL PUBLIKASI — TANPA KETERSEDIAAN) */}
        <aside className="admin-form-side">
          <section className="admin-panel">
            <div className="admin-panel__head admin-panel__head--split">
              <h3 className="admin-panel__subhead">Publikasi</h3>
              <StatusDot label={pubBadge.label} tone={pubBadge.tone} />
            </div>
            <div className="admin-side-body">
              <div className="admin-field">
                <label htmlFor="pameran-pub-status" className="admin-label">
                  Status publikasi
                </label>
                <select
                  id="pameran-pub-status"
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
                <label htmlFor="pameran-pub-date" className="admin-label">
                  Tanggal terbit
                </label>
                <input
                  id="pameran-pub-date"
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
        </aside>

        {/* BAGIAN FOTO (LEBAR PENUH + PILIHAN TITIK FOKUS KARTU) */}
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
            enableFocalPoint
            focalPoint={form.focalPoint}
            onFocalPointChange={(nextFocal) => updateField('focalPoint', nextFocal)}
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

