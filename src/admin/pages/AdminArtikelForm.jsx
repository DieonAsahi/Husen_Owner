import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdminAuth, useConfirm, useToast } from '../context/adminContexts';
import AdminSlugField from '../components/AdminSlugField';
import MediumCombobox from '../components/MediumCombobox';
import StatusDot from '../components/StatusDot';
import {
  IconArrowUp,
  IconArrowDown,
  IconPlus,
  IconTrash,
  IconUpload,
} from '../components/AdminIcons';
import { mapPublishBadge } from '../services/adminApi';
import { slugifyText } from '../services/adminContentStore';
import {
  ARTICLE_CATEGORY_OPTIONS,
  estimateReadingMinutes,
  getArticleAdminBySlug,
  saveArticleAdmin,
} from '../services/adminStudioStore';
import {
  validateImageFile,
  readImageFileWithDimensions,
} from '../services/adminImageHelper';

const MAX_SUMMARY_CHARS = 240;

function createEmptyArtikel() {
  return {
    id: '',
    slug: '',
    title: '',
    category: 'ARTISTIC PRACTICE',
    summary: '',
    content: [''],
    quote: '',
    author: 'Husen Nursidik',
    place: '',
    readingMinutes: 1,
    publishStatus: 'DRAFT',
    publishedDate: new Date().toISOString().split('T')[0],
    images: [],
  };
}

export default function AdminArtikelForm() {
  const { slug } = useParams();
  const isNew = !slug || slug === 'baru';
  const navigate = useNavigate();
  const { user } = useAdminAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const coverInputRef = useRef(null);

  const [prevSlug, setPrevSlug] = useState(slug);
  const [loadState, setLoadState] = useState({
    status: isNew ? 'ready' : 'loading',
    error: '',
  });
  const [form, setForm] = useState(createEmptyArtikel);
  const [initialJson, setInitialJson] = useState(() => JSON.stringify(createEmptyArtikel()));
  const [wasPublishedInitially, setWasPublishedInitially] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [readingManualOverride, setReadingManualOverride] = useState(false);
  const [errors, setErrors] = useState({});
  const [coverError, setCoverError] = useState('');
  const [saving, setSaving] = useState(false);

  if (prevSlug !== slug) {
    setPrevSlug(slug);
    const empty = createEmptyArtikel();
    setForm(empty);
    setInitialJson(JSON.stringify(empty));
    setWasPublishedInitially(false);
    setSlugTouched(false);
    setReadingManualOverride(false);
    setErrors({});
    setLoadState({ status: isNew ? 'ready' : 'loading', error: '' });
  }

  useEffect(() => {
    if (isNew) return undefined;

    let cancelled = false;
    getArticleAdminBySlug(slug)
      .then((item) => {
        if (cancelled) return;
        if (!item) {
          setLoadState({
            status: 'error',
            error: `Artikel dengan slug "${slug}" tidak ditemukan.`,
          });
          return;
        }
        const loaded = {
          ...item,
          content: Array.isArray(item.content) && item.content.length > 0 ? item.content : [''],
          images: Array.isArray(item.images) ? item.images.slice(0, 1) : [],
        };
        setForm(loaded);
        setInitialJson(JSON.stringify(loaded));
        setWasPublishedInitially(loaded.publishStatus === 'PUBLISHED');
        setSlugTouched(true);
        const est = estimateReadingMinutes(loaded.content, loaded.summary).minutes;
        setReadingManualOverride(Number(loaded.readingMinutes) !== est);
        setLoadState({ status: 'ready', error: '' });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState({ status: 'error', error: 'Gagal memuat data artikel dari studio.' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, isNew]);

  const isDirty = useMemo(() => JSON.stringify(form) !== initialJson, [form, initialJson]);

  const readingCalc = useMemo(
    () => estimateReadingMinutes(form.content, form.summary),
    [form.content, form.summary]
  );

  const displayedReadingMinutes = readingManualOverride
    ? form.readingMinutes
    : readingCalc.minutes;

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && isNew && !slugTouched) {
        next.slug = slugifyText(value);
      }
      return next;
    });
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleParagraphChange = (idx, text) => {
    setForm((prev) => {
      const nextContent = [...prev.content];
      nextContent[idx] = text;
      return { ...prev, content: nextContent };
    });
    if (errors.content) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.content;
        return copy;
      });
    }
  };

  const handleAddParagraph = () => {
    setForm((prev) => ({
      ...prev,
      content: [...prev.content, ''],
    }));
  };

  const handleMoveParagraph = (fromIdx, toIdx) => {
    setForm((prev) => {
      if (toIdx < 0 || toIdx >= prev.content.length) return prev;
      const next = [...prev.content];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return { ...prev, content: next };
    });
  };

  const handleRemoveParagraph = async (idx) => {
    if (form.content.length <= 1) {
      showToast({ message: 'Minimal harus terdapat satu blok paragraf.', tone: 'warning' });
      return;
    }
    const textVal = String(form.content[idx] || '').trim();
    if (textVal) {
      const agreed = await confirm({
        title: `Hapus Paragraf ${idx + 1}?`,
        message: 'Paragraf yang sudah berisi teks akan dihapus dari artikel ini.',
        confirmLabel: 'Hapus Paragraf',
        cancelLabel: 'Batal',
        destructive: true,
      });
      if (!agreed) return;
    }
    setForm((prev) => ({
      ...prev,
      content: prev.content.filter((_, i) => i !== idx),
    }));
  };

  const handleCoverUpload = async (file) => {
    setCoverError('');
    const errMsg = validateImageFile(file);
    if (errMsg) {
      setCoverError(errMsg);
      return;
    }
    try {
      const loaded = await readImageFileWithDimensions(file);
      setForm((prev) => ({
        ...prev,
        images: [
          {
            ...loaded,
            isCover: true,
            alt: prev.images?.[0]?.alt || '',
          },
        ],
      }));
      showToast({ message: 'Foto sampul berhasil dimuat.', tone: 'success' });
    } catch (err) {
      setCoverError(err.message);
    }
  };

  const handleRemoveCover = async () => {
    const agreed = await confirm({
      title: 'Hapus Foto Sampul?',
      message: 'Foto sampul artikel akan dilepas dari formulir ini.',
      confirmLabel: 'Hapus Foto',
      cancelLabel: 'Batal',
      destructive: true,
    });
    if (!agreed) return;
    setForm((prev) => ({ ...prev, images: [] }));
  };

  const validateForm = (targetPublishStatus) => {
    const nextErrors = {};
    if (!String(form.title || '').trim()) {
      nextErrors.title = 'Judul artikel wajib diisi.';
    }
    if (!slugifyText(form.slug || form.title)) {
      nextErrors.slug = 'Slug URL artikel wajib diisi.';
    }
    if (String(form.summary || '').length > MAX_SUMMARY_CHARS) {
      nextErrors.summary = `Ringkasan maksimal ${MAX_SUMMARY_CHARS} karakter.`;
    }
    const readMin = Number(displayedReadingMinutes);
    if (!Number.isFinite(readMin) || readMin < 1) {
      nextErrors.readingMinutes = 'Waktu baca minimal 1 menit.';
    }

    const cover = form.images?.[0];
    if (cover && !String(cover.alt || '').trim()) {
      nextErrors.coverAlt = 'Teks alternatif foto sampul wajib diisi.';
    }

    if (targetPublishStatus === 'PUBLISHED') {
      if (!String(form.category || '').trim()) {
        nextErrors.category = 'Kategori artikel wajib dipilih atau diisi.';
      }
      if (!String(form.summary || '').trim()) {
        nextErrors.summary = 'Ringkasan artikel wajib diisi sebelum diterbitkan.';
      }
      const nonEmptyParagraphs = form.content.filter((p) => String(p || '').trim().length > 0);
      if (nonEmptyParagraphs.length === 0) {
        nextErrors.content = 'Minimal satu paragraf isi artikel harus terisi sebelum diterbitkan.';
      }
      if (!cover) {
        nextErrors.cover = 'Foto sampul wajib diunggah sebelum menerbitkan artikel.';
      } else if (!String(cover.alt || '').trim()) {
        nextErrors.coverAlt = 'Teks alternatif foto sampul wajib diisi sebelum menerbitkan.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async (overrideStatus = null) => {
    const targetStatus = overrideStatus || form.publishStatus;
    if (!validateForm(targetStatus)) {
      showToast({
        message: 'Periksa kembali kolom yang masih belum lengkap.',
        tone: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      const cleanedContent = form.content.map((p) => String(p || '').trimEnd());
      const payload = {
        ...form,
        content: cleanedContent,
        slug: slugifyText(form.slug || form.title),
        readingMinutes: Number(displayedReadingMinutes) || 1,
        publishStatus: targetStatus,
      };
      const saved = await saveArticleAdmin(payload, user);
      setForm(saved);
      setInitialJson(JSON.stringify(saved));
      if (saved.publishStatus === 'PUBLISHED') {
        setWasPublishedInitially(true);
      }
      showToast({
        message:
          targetStatus === 'PUBLISHED'
            ? `Artikel "${saved.title}" berhasil diterbitkan.`
            : `Draft artikel "${saved.title}" berhasil disimpan.`,
        tone: 'success',
      });
      if (isNew || saved.slug !== slug) {
        navigate(`/artikel/${saved.slug}`, { replace: true });
      }
    } catch (err) {
      showToast({ message: err?.message || 'Gagal menyimpan artikel.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackClick = async (e) => {
    if (!isDirty) return;
    e.preventDefault();
    const agreed = await confirm({
      title: 'Tinggalkan Halaman Ini?',
      message: 'Terdapat perubahan artikel yang belum disimpan dan akan hilang.',
      confirmLabel: 'Tinggalkan',
      cancelLabel: 'Tetap di Sini',
      destructive: true,
    });
    if (agreed) navigate('/artikel');
  };

  if (loadState.status === 'loading') {
    return (
      <div className="admin-form-page">
        <div className="admin-form-top">
          <Link to="/artikel" className="admin-text-link">← Daftar Artikel</Link>
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
          <Link to="/artikel" className="admin-text-link">← Daftar Artikel</Link>
        </div>
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT ARTIKEL" tone="danger" />
            <p className="admin-state-box__msg">{loadState.error}</p>
            <Link to="/artikel" className="admin-btn admin-btn--secondary">
              ← Kembali ke Daftar Artikel
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const pubBadge = mapPublishBadge(form.publishStatus);
  const coverPhoto = form.images?.[0] || null;
  const coverAltMissing = Boolean(coverPhoto && !String(coverPhoto.alt || '').trim());

  return (
    <div className="admin-form-page admin-form-page--has-sticky">
      <div className="admin-form-top">
        <div className="admin-form-top__left">
          <Link to="/artikel" className="admin-text-link" onClick={handleBackClick}>
            ← Daftar Artikel
          </Link>
          <h2 className="admin-form-top__title">
            {isNew ? 'Tambah Artikel' : form.title || 'Sunting Artikel'}
          </h2>
        </div>

        {isDirty && <StatusDot label="Perubahan belum disimpan" tone="warning" />}
      </div>

      <form
        className="admin-two-col"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        noValidate
      >
        {/* KOLOM UTAMA */}
        <div className="admin-form-main">
          <section className="admin-panel admin-panel--padded">
            <div className="admin-form">
              {/* Judul */}
              <div className="admin-field">
                <label htmlFor="artikel-title" className="admin-label">
                  Judul artikel
                </label>
                <input
                  id="artikel-title"
                  type="text"
                  className={`admin-input ${errors.title ? 'is-error' : ''}`}
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Contoh: Di Balik Pigmen Oker"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'artikel-title-err' : undefined}
                />
                {errors.title && (
                  <p id="artikel-title-err" className="admin-field__error" role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Slug & Kategori */}
              <AdminSlugField
                id="artikel-slug"
                value={form.slug}
                isPublishedInitially={wasPublishedInitially}
                basePrefix="/artikel/"
                error={errors.slug}
                onChange={(val) => {
                  setSlugTouched(true);
                  updateField('slug', slugifyText(val));
                }}
              />

              <MediumCombobox
                id="artikel-category"
                label="Kategori"
                options={ARTICLE_CATEGORY_OPTIONS}
                placeholder="Pilih atau ketik kategori..."
                listboxLabel="Pilihan kategori artikel"
                value={form.category}
                error={errors.category}
                onChange={(val) => updateField('category', val)}
              />

              {/* Ringkasan (penghitung 200 karakter) */}
              <div className="admin-field">
                <div className="admin-label-row">
                  <label htmlFor="artikel-summary" className="admin-label">
                    Ringkasan
                  </label>
                  <span
                    className={`admin-char-count ${form.summary.length > MAX_SUMMARY_CHARS ? 'is-over' : ''}`}
                  >
                    {form.summary.length} / {MAX_SUMMARY_CHARS} karakter
                  </span>
                </div>
                <textarea
                  id="artikel-summary"
                  rows={3}
                  className={`admin-textarea ${errors.summary ? 'is-error' : ''}`}
                  value={form.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="Ringkasan singkat satu paragraf untuk pratinjau kartu artikel..."
                  aria-invalid={Boolean(errors.summary)}
                  aria-describedby={errors.summary ? 'artikel-summary-err' : undefined}
                />
                {errors.summary && (
                  <p id="artikel-summary-err" className="admin-field__error" role="alert">
                    {errors.summary}
                  </p>
                )}
              </div>

              {/* Isi artikel sebagai blok paragraf */}
              <div className="admin-field">
                <div className="admin-label-row">
                  <span className="admin-label">Isi artikel (blok paragraf)</span>
                  <span className="admin-field__help">
                    {form.content.length} paragraf · {readingCalc.words} kata
                  </span>
                </div>

                {errors.content && (
                  <p className="admin-field__error" role="alert">
                    {errors.content}
                  </p>
                )}

                <div className="admin-paragraph-list">
                  {form.content.map((para, idx) => (
                    <div key={`para-${idx}`} className="admin-paragraph-block">
                      <div className="admin-paragraph-block__head">
                        <label
                          htmlFor={`artikel-para-${idx}`}
                          className="admin-paragraph-block__label"
                        >
                          Paragraf {idx + 1}
                        </label>
                        <div className="admin-paragraph-block__actions">
                          <button
                            type="button"
                            className="admin-icon-btn"
                            disabled={idx === 0}
                            onClick={() => handleMoveParagraph(idx, idx - 1)}
                            aria-label={`Geser paragraf ${idx + 1} ke atas`}
                            title="Geser ke atas"
                          >
                            <IconArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn"
                            disabled={idx === form.content.length - 1}
                            onClick={() => handleMoveParagraph(idx, idx + 1)}
                            aria-label={`Geser paragraf ${idx + 1} ke bawah`}
                            title="Geser ke bawah"
                          >
                            <IconArrowDown size={15} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-btn admin-icon-btn--danger"
                            onClick={() => handleRemoveParagraph(idx)}
                            aria-label={`Hapus paragraf ${idx + 1}`}
                            title="Hapus paragraf"
                          >
                            <IconTrash size={15} />
                          </button>
                        </div>
                      </div>

                      <textarea
                        id={`artikel-para-${idx}`}
                        rows={4}
                        className="admin-textarea"
                        value={para}
                        onChange={(e) => handleParagraphChange(idx, e.target.value)}
                        placeholder={`Tulis isi paragraf ke-${idx + 1}...`}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={handleAddParagraph}
                  >
                    <IconPlus size={15} />
                    Tambah paragraf
                  </button>
                </div>
              </div>

              {/* Kutipan pilihan */}
              <div className="admin-field">
                <label htmlFor="artikel-quote" className="admin-label">
                  Kutipan pilihan (opsional)
                </label>
                <textarea
                  id="artikel-quote"
                  rows={2}
                  className="admin-textarea"
                  value={form.quote}
                  onChange={(e) => updateField('quote', e.target.value)}
                  placeholder="Kutipan utama yang ditonjolkan dalam artikel..."
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
                <label htmlFor="artikel-pub-status" className="admin-label">
                  Status publikasi
                </label>
                <select
                  id="artikel-pub-status"
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
                <label htmlFor="artikel-pub-date" className="admin-label">
                  Tanggal terbit
                </label>
                <input
                  id="artikel-pub-date"
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
                  {form.publishStatus === 'PUBLISHED' ? 'Perbarui Terbitan' : 'Terbitkan'}
                </button>
                <a
                  href={`/artikel/${form.slug || slugifyText(form.title) || 'pratinjau'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-btn admin-btn--secondary admin-btn--full"
                >
                  Pratinjau ↗
                </a>
              </div>
            </div>
          </section>

          {/* Panel Penulis, Tempat, Waktu Baca */}
          <section className="admin-panel">
            <div className="admin-panel__head">
              <h3 className="admin-panel__subhead">Kredit &amp; Bacaan</h3>
            </div>
            <div className="admin-side-body">
              <div className="admin-field">
                <label htmlFor="artikel-author" className="admin-label">
                  Penulis
                </label>
                <input
                  id="artikel-author"
                  type="text"
                  className="admin-input"
                  value={form.author}
                  onChange={(e) => updateField('author', e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label htmlFor="artikel-place" className="admin-label">
                  Tempat (opsional)
                </label>
                <input
                  id="artikel-place"
                  type="text"
                  className="admin-input"
                  value={form.place}
                  onChange={(e) => updateField('place', e.target.value)}
                  placeholder="Studio Husen · Bandung"
                />
              </div>

              <div className="admin-field">
                <div className="admin-label-row">
                  <label htmlFor="artikel-reading" className="admin-label">
                    Perkiraan waktu baca (menit)
                  </label>
                  {readingManualOverride && (
                    <button
                      type="button"
                      className="admin-text-link admin-text-link--sm"
                      onClick={() => {
                        setReadingManualOverride(false);
                        updateField('readingMinutes', readingCalc.minutes);
                      }}
                    >
                      Otomatis ({readingCalc.minutes} mnt)
                    </button>
                  )}
                </div>
                <input
                  id="artikel-reading"
                  type="number"
                  min={1}
                  max={120}
                  className={`admin-input ${errors.readingMinutes ? 'is-error' : ''}`}
                  value={displayedReadingMinutes}
                  onChange={(e) => {
                    setReadingManualOverride(true);
                    updateField('readingMinutes', e.target.value);
                  }}
                />
                <p className="admin-field__help">
                  {readingManualOverride
                    ? `Disetel manual (hitungan otomatis: ${readingCalc.minutes} menit dari ${readingCalc.words} kata).`
                    : `Dihitung otomatis dari ${readingCalc.words} kata.`}
                </p>
                {errors.readingMinutes && (
                  <p className="admin-field__error" role="alert">
                    {errors.readingMinutes}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Panel Foto Sampul (Satu Foto + Alt Wajib) */}
          <section className="admin-panel">
            <div className="admin-panel__head">
              <h3 className="admin-panel__subhead">Foto Sampul</h3>
            </div>
            <div className="admin-side-body">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="admin-sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                  e.target.value = '';
                }}
              />

              {coverPhoto ? (
                <div className="admin-cover-box">
                  <div className="admin-photo-card__preview">
                    <img
                      src={coverPhoto.url}
                      alt={coverPhoto.alt || 'Foto sampul artikel'}
                      className="admin-photo-card__img"
                    />
                    {coverPhoto.width > 0 && (
                      <span className="admin-photo-card__dims">
                        {coverPhoto.width} × {coverPhoto.height} px
                      </span>
                    )}
                  </div>
                  <div className="admin-cover-box__btns">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      Ganti foto
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={handleRemoveCover}
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="admin-field">
                    <label htmlFor="artikel-cover-alt" className="admin-label">
                      Teks alternatif foto sampul (wajib)
                    </label>
                    <input
                      id="artikel-cover-alt"
                      type="text"
                      className={`admin-input ${errors.coverAlt ? 'is-error' : ''}`}
                      value={coverPhoto.alt || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          images: [{ ...coverPhoto, alt: val }],
                        }));
                        if (errors.coverAlt) {
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy.coverAlt;
                            return copy;
                          });
                        }
                      }}
                      placeholder="Deskripsi singkat foto sampul"
                      aria-invalid={Boolean(errors.coverAlt || coverAltMissing)}
                    />
                    {errors.coverAlt && (
                      <p className="admin-field__error" role="alert">
                        {errors.coverAlt}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-dropzone admin-dropzone--compact"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <IconUpload size={20} />
                  <span className="admin-dropzone__text">
                    Pilih foto sampul artikel (JPG, PNG, WebP, maks 20 MB)
                  </span>
                </button>
              )}

              {(coverError || errors.cover) && (
                <p className="admin-field__error" role="alert">
                  {coverError || errors.cover}
                </p>
              )}
            </div>
          </section>

          {/* Pratinjau Kartu Artikel Langsung */}
          <section className="admin-panel">
            <div className="admin-panel__head">
              <h3 className="admin-panel__subhead">Pratinjau Kartu Artikel</h3>
            </div>
            <div className="admin-side-body">
              <article className="admin-article-preview" aria-label="Pratinjau tampilan kartu artikel">
                {coverPhoto ? (
                  <div className="admin-article-preview__media">
                    <img src={coverPhoto.url} alt="" />
                  </div>
                ) : (
                  <div className="admin-article-preview__media admin-article-preview__media--empty">
                    Belum ada foto sampul
                  </div>
                )}
                <div className="admin-article-preview__body">
                  <div className="admin-article-preview__meta">
                    <span>{form.category || 'KATEGORI'}</span>
                    <span>{displayedReadingMinutes} menit baca</span>
                  </div>
                  <h4 className="admin-article-preview__title">
                    {form.title || 'Judul Artikel Studio'}
                  </h4>
                  <p className="admin-article-preview__summary">
                    {form.summary || 'Ringkasan artikel akan tampil di sini.'}
                  </p>
                  <p className="admin-article-preview__footer">
                    {form.author || 'Husen Nursidik'}
                    {form.place ? ` · ${form.place}` : ''}
                  </p>
                </div>
              </article>
            </div>
          </section>
        </aside>
      </form>

      {/* Bilah Aksi Menempel di Ponsel */}
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
