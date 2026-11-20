import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminAuth, useToast } from '../context/adminContexts';
import StatusDot from '../components/StatusDot';
import { IconUpload } from '../components/AdminIcons';
import {
  getSiteSettingsAdmin,
  saveSiteSettingsSectionAdmin,
} from '../services/adminStudioStore';
import {
  validateImageFile,
  readImageFileWithDimensions,
} from '../services/adminImageHelper';

function formatTimestampId(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoStr));
  } catch {
    return isoStr;
  }
}

function isValidHttpUrl(val) {
  const s = String(val || '').trim();
  if (!s) return true;
  try {
    const parsed = new URL(s);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function AdminSettingsPage() {
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const portraitInputRef = useRef(null);

  const isOwner = user?.role === 'OWNER';
  const stateOverride = import.meta.env.DEV ? searchParams.get('state') : null;
  const rawTab = searchParams.get('tab') || 'kontak';
  const activeTab =
    rawTab === 'laporan' && isOwner
      ? 'laporan'
      : rawTab === 'konten'
        ? 'konten'
        : 'kontak';

  const [loadState, setLoadState] = useState({ status: 'loading', error: '' });
  const [settings, setSettings] = useState(null);
  const [errors, setErrors] = useState({});
  const [portraitError, setPortraitError] = useState('');
  const [savingTab, setSavingTab] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (stateOverride === 'loading') return undefined;
    let cancelled = false;
    getSiteSettingsAdmin({ simulateState: stateOverride === 'error' ? 'error' : null })
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setLoadState({ status: 'ready', error: '' });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadState({ status: 'error', error: err?.message || 'Gagal memuat pengaturan.' });
      });
    return () => {
      cancelled = true;
    };
  }, [stateOverride, reloadTick]);

  const handleTabChange = (nextTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
    setErrors({});
  };

  const clearError = (key) => {
    if (!errors[key]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleContactField = (key, val) => {
    setSettings((prev) => ({
      ...prev,
      contact: { ...prev.contact, [key]: val },
    }));
    clearError(key);
  };

  const handleTentangField = (key, val) => {
    setSettings((prev) => ({
      ...prev,
      pageContent: {
        ...prev.pageContent,
        tentang: { ...prev.pageContent.tentang, [key]: val },
      },
    }));
    clearError(key);
  };

  const handleStepField = (index, key, val) => {
    setSettings((prev) => {
      const nextSteps = [...prev.pageContent.customOrderSteps];
      nextSteps[index] = { ...nextSteps[index], [key]: val };
      return {
        ...prev,
        pageContent: { ...prev.pageContent, customOrderSteps: nextSteps },
      };
    });
    clearError(`step-${index}-${key}`);
  };

  const handleAnalyticsField = (key, val) => {
    setSettings((prev) => ({
      ...prev,
      analytics: { ...prev.analytics, [key]: val },
    }));
    clearError(key);
  };

  const handlePortraitUpload = async (file) => {
    setPortraitError('');
    const errMsg = validateImageFile(file);
    if (errMsg) {
      setPortraitError(errMsg);
      return;
    }
    try {
      const loaded = await readImageFileWithDimensions(file);
      handleTentangField('portraitUrl', loaded.url);
      showToast({ message: 'Foto potret seniman berhasil diperbarui.', tone: 'success' });
    } catch (err) {
      setPortraitError(err.message);
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    const c = settings.contact;
    const nextErrors = {};
    if (!String(c.whatsapp || '').trim()) {
      nextErrors.whatsapp = 'Nomor WhatsApp studio wajib diisi.';
    } else if (!String(c.whatsapp).trim().startsWith('+62')) {
      nextErrors.whatsapp = 'Nomor WhatsApp harus diawali format +62...';
    }
    if (!String(c.email || '').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email).trim())) {
      nextErrors.email = 'Masukkan alamat surel korespondensi yang valid.';
    }
    if (!String(c.locationNotes || '').trim()) {
      nextErrors.locationNotes = 'Catatan lokasi studio wajib diisi.';
    }
    if (!String(c.copyrightText || '').trim()) {
      nextErrors.copyrightText = 'Teks hak cipta wajib diisi.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast({ message: 'Periksa kembali kolom Kontak yang belum valid.', tone: 'error' });
      return;
    }

    setSavingTab('kontak');
    try {
      const updated = await saveSiteSettingsSectionAdmin('contact', c, user, 'Tab Kontak');
      setSettings(updated);
      showToast({ message: 'Pengaturan Kontak berhasil disimpan.', tone: 'success' });
    } catch (err) {
      showToast({ message: err?.message || 'Gagal menyimpan pengaturan.', tone: 'error' });
    } finally {
      setSavingTab('');
    }
  };

  const handleSaveContent = async (e) => {
    e.preventDefault();
    const p = settings.pageContent;
    const nextErrors = {};
    if (!String(p.heroQuote || '').trim()) {
      nextErrors.heroQuote = 'Kutipan hero wajib diisi.';
    }
    if (!String(p.tentang.biografi || '').trim()) {
      nextErrors.biografi = 'Biografi seniman wajib diisi.';
    }
    if (!String(p.tentang.filosofi || '').trim()) {
      nextErrors.filosofi = 'Filosofi berkarya wajib diisi.';
    }
    if (!String(p.tentang.portraitAlt || '').trim()) {
      nextErrors.portraitAlt = 'Teks alternatif potret seniman wajib diisi.';
    }
    p.customOrderSteps.forEach((step, idx) => {
      if (!String(step.title || '').trim()) {
        nextErrors[`step-${idx}-title`] = `Judul Langkah ${step.stepNumber} wajib diisi.`;
      }
      if (!String(step.description || '').trim()) {
        nextErrors[`step-${idx}-description`] = `Deskripsi Langkah ${step.stepNumber} wajib diisi.`;
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast({ message: 'Periksa kembali kolom Konten Halaman yang belum lengkap.', tone: 'error' });
      return;
    }

    setSavingTab('konten');
    try {
      const updated = await saveSiteSettingsSectionAdmin('pageContent', p, user, 'Tab Konten Halaman');
      setSettings(updated);
      showToast({ message: 'Konten Halaman berhasil disimpan.', tone: 'success' });
    } catch (err) {
      showToast({ message: err?.message || 'Gagal menyimpan konten halaman.', tone: 'error' });
    } finally {
      setSavingTab('');
    }
  };

  const handleSaveAnalytics = async (e) => {
    e.preventDefault();
    const a = settings.analytics;
    const nextErrors = {};
    if (!isValidHttpUrl(a.ga4Url)) {
      nextErrors.ga4Url = 'Masukkan tautan URL lengkap diawali https://...';
    }
    if (!isValidHttpUrl(a.lookerEmbedUrl)) {
      nextErrors.lookerEmbedUrl = 'Masukkan tautan sematan URL lengkap diawali https://...';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast({ message: 'Periksa kembali format tautan laporan.', tone: 'error' });
      return;
    }

    setSavingTab('laporan');
    try {
      const updated = await saveSiteSettingsSectionAdmin('analytics', a, user, 'Tab Tautan Laporan');
      setSettings(updated);
      showToast({ message: 'Tautan Laporan berhasil disimpan.', tone: 'success' });
    } catch (err) {
      showToast({ message: err?.message || 'Gagal menyimpan tautan laporan.', tone: 'error' });
    } finally {
      setSavingTab('');
    }
  };

  const isLoading = stateOverride === 'loading' || loadState.status === 'loading';
  const isError = stateOverride !== 'loading' && loadState.status === 'error';

  const lastEditedCaption = settings
    ? `Terakhir diubah oleh ${settings.lastUpdatedBy} pada ${formatTimestampId(settings.lastUpdatedAt)}`
    : '';

  return (
    <div className="admin-entity-page">
      <header className="admin-list-header">
        <div className="admin-list-header__title-wrap">
          <h2 className="admin-list-header__heading">Pengaturan Situs</h2>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="admin-tabs" role="tablist" aria-label="Kategori pengaturan situs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'kontak'}
          className={`admin-tab-btn ${activeTab === 'kontak' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('kontak')}
        >
          Kontak
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'konten'}
          className={`admin-tab-btn ${activeTab === 'konten' ? 'is-active' : ''}`}
          onClick={() => handleTabChange('konten')}
        >
          Konten Halaman
        </button>
        {isOwner && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'laporan'}
            className={`admin-tab-btn ${activeTab === 'laporan' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('laporan')}
          >
            Tautan Laporan
          </button>
        )}
      </div>

      {isError && (
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT PENGATURAN" tone="danger" />
            <p className="admin-state-box__msg">{loadState.error}</p>
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={() => setReloadTick((t) => t + 1)}
            >
              Muat ulang
            </button>
          </div>
        </section>
      )}

      {isLoading && (
        <section className="admin-panel" aria-label="Memuat pengaturan situs">
          <div className="admin-skeleton-rows">
            <div className="admin-skeleton admin-skeleton--title" />
            <div className="admin-skeleton admin-skeleton--label" />
            <div className="admin-skeleton admin-skeleton--meta" />
          </div>
        </section>
      )}

      {!isLoading && !isError && settings && (
        <>
          {/* TAB 1: KONTAK */}
          {activeTab === 'kontak' && (
            <form
              className="admin-panel admin-panel--padded"
              role="tabpanel"
              aria-label="Pengaturan Kontak"
              onSubmit={handleSaveContact}
              noValidate
            >
              <div className="admin-form">
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label htmlFor="set-wa" className="admin-label">
                      WhatsApp
                    </label>
                    <input
                      id="set-wa"
                      type="text"
                      className={`admin-input ${errors.whatsapp ? 'is-error' : ''}`}
                      value={settings.contact.whatsapp}
                      onChange={(e) => handleContactField('whatsapp', e.target.value)}
                      placeholder="+62 812 3456 7890"
                      aria-describedby="set-wa-help"
                    />
                    <p id="set-wa-help" className="admin-field__help">
                      Gunakan kode negara Indonesia dengan format +62...
                    </p>
                    {errors.whatsapp && (
                      <p className="admin-field__error" role="alert">{errors.whatsapp}</p>
                    )}
                  </div>

                  <div className="admin-field">
                    <label htmlFor="set-email" className="admin-label">
                      Surel korespondensi
                    </label>
                    <input
                      id="set-email"
                      type="email"
                      className={`admin-input ${errors.email ? 'is-error' : ''}`}
                      value={settings.contact.email}
                      onChange={(e) => handleContactField('email', e.target.value)}
                      placeholder="studio@husennursidik.art"
                    />
                    {errors.email && (
                      <p className="admin-field__error" role="alert">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="admin-field-row">
                  <div className="admin-field">
                    <label htmlFor="set-ig" className="admin-label">
                      Instagram
                    </label>
                    <input
                      id="set-ig"
                      type="text"
                      className="admin-input"
                      value={settings.contact.instagram}
                      onChange={(e) => handleContactField('instagram', e.target.value)}
                      placeholder="@husennursidik.art"
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="set-fb" className="admin-label">
                      Facebook
                    </label>
                    <input
                      id="set-fb"
                      type="text"
                      className="admin-input"
                      value={settings.contact.facebook}
                      onChange={(e) => handleContactField('facebook', e.target.value)}
                      placeholder="House of Art – Husen Nursidik"
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="set-loc" className="admin-label">
                    Catatan lokasi studio
                  </label>
                  <textarea
                    id="set-loc"
                    rows={3}
                    className={`admin-textarea ${errors.locationNotes ? 'is-error' : ''}`}
                    value={settings.contact.locationNotes}
                    onChange={(e) => handleContactField('locationNotes', e.target.value)}
                  />
                  {errors.locationNotes && (
                    <p className="admin-field__error" role="alert">{errors.locationNotes}</p>
                  )}
                </div>

                <div className="admin-field">
                  <label htmlFor="set-copy" className="admin-label">
                    Teks hak cipta
                  </label>
                  <input
                    id="set-copy"
                    type="text"
                    className={`admin-input ${errors.copyrightText ? 'is-error' : ''}`}
                    value={settings.contact.copyrightText}
                    onChange={(e) => handleContactField('copyrightText', e.target.value)}
                  />
                  {errors.copyrightText && (
                    <p className="admin-field__error" role="alert">{errors.copyrightText}</p>
                  )}
                </div>

                <div className="admin-tab-footer">
                  <p className="admin-tab-footer__meta">{lastEditedCaption}</p>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    disabled={savingTab === 'kontak'}
                  >
                    {savingTab === 'kontak' ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: KONTEN HALAMAN */}
          {activeTab === 'konten' && (
            <form
              className="admin-panel admin-panel--padded"
              role="tabpanel"
              aria-label="Pengaturan Konten Halaman"
              onSubmit={handleSaveContent}
              noValidate
            >
              <div className="admin-form">
                <div className="admin-settings-group">
                  <h3 className="admin-settings-group__title">Gerbang Hero</h3>
                  <div className="admin-field">
                    <label htmlFor="set-hero-quote" className="admin-label">
                      Kutipan hero
                    </label>
                    <textarea
                      id="set-hero-quote"
                      rows={2}
                      className={`admin-textarea ${errors.heroQuote ? 'is-error' : ''}`}
                      value={settings.pageContent.heroQuote}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          pageContent: { ...prev.pageContent, heroQuote: e.target.value },
                        }));
                        clearError('heroQuote');
                      }}
                    />
                    {errors.heroQuote && (
                      <p className="admin-field__error" role="alert">{errors.heroQuote}</p>
                    )}
                  </div>
                </div>

                <div className="admin-settings-group">
                  <h3 className="admin-settings-group__title">Bagian Tentang Seniman</h3>

                  <div className="admin-portrait-row">
                    <div className="admin-portrait-row__preview">
                      {settings.pageContent.tentang.portraitUrl ? (
                        <img
                          src={settings.pageContent.tentang.portraitUrl}
                          alt={settings.pageContent.tentang.portraitAlt || 'Potret seniman'}
                        />
                      ) : (
                        <span>Belum ada potret</span>
                      )}
                    </div>

                    <div className="admin-portrait-row__fields">
                      <input
                        ref={portraitInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="admin-sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePortraitUpload(file);
                          e.target.value = '';
                        }}
                      />
                      <div>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary"
                          onClick={() => portraitInputRef.current?.click()}
                        >
                          <IconUpload size={16} />
                          Unggah potret seniman
                        </button>
                      </div>
                      {portraitError && (
                        <p className="admin-field__error" role="alert">{portraitError}</p>
                      )}
                      <div className="admin-field">
                        <label htmlFor="set-portrait-alt" className="admin-label">
                          Teks alternatif potret
                        </label>
                        <input
                          id="set-portrait-alt"
                          type="text"
                          className={`admin-input ${errors.portraitAlt ? 'is-error' : ''}`}
                          value={settings.pageContent.tentang.portraitAlt}
                          onChange={(e) => handleTentangField('portraitAlt', e.target.value)}
                        />
                        {errors.portraitAlt && (
                          <p className="admin-field__error" role="alert">{errors.portraitAlt}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="admin-field">
                    <label htmlFor="set-bio" className="admin-label">Biografi</label>
                    <textarea
                      id="set-bio"
                      rows={3}
                      className={`admin-textarea ${errors.biografi ? 'is-error' : ''}`}
                      value={settings.pageContent.tentang.biografi}
                      onChange={(e) => handleTentangField('biografi', e.target.value)}
                    />
                    {errors.biografi && (
                      <p className="admin-field__error" role="alert">{errors.biografi}</p>
                    )}
                  </div>

                  <div className="admin-field">
                    <label htmlFor="set-filosofi" className="admin-label">Filosofi</label>
                    <textarea
                      id="set-filosofi"
                      rows={2}
                      className={`admin-textarea ${errors.filosofi ? 'is-error' : ''}`}
                      value={settings.pageContent.tentang.filosofi}
                      onChange={(e) => handleTentangField('filosofi', e.target.value)}
                    />
                    {errors.filosofi && (
                      <p className="admin-field__error" role="alert">{errors.filosofi}</p>
                    )}
                  </div>

                  <div className="admin-field">
                    <label htmlFor="set-perjalanan" className="admin-label">Perjalanan</label>
                    <textarea
                      id="set-perjalanan"
                      rows={2}
                      className="admin-textarea"
                      value={settings.pageContent.tentang.perjalanan}
                      onChange={(e) => handleTentangField('perjalanan', e.target.value)}
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="set-praktik" className="admin-label">Praktik berkarya</label>
                    <textarea
                      id="set-praktik"
                      rows={3}
                      className="admin-textarea"
                      value={settings.pageContent.tentang.praktik}
                      onChange={(e) => handleTentangField('praktik', e.target.value)}
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="set-jenis-karya" className="admin-label">Jenis karya</label>
                    <textarea
                      id="set-jenis-karya"
                      rows={2}
                      className="admin-textarea"
                      value={settings.pageContent.tentang.jenisKarya}
                      onChange={(e) => handleTentangField('jenisKarya', e.target.value)}
                    />
                  </div>
                </div>

                <div className="admin-settings-group">
                  <h3 className="admin-settings-group__title">Custom Order (4 Langkah)</h3>
                  <div className="admin-steps-grid">
                    {settings.pageContent.customOrderSteps.map((step, idx) => (
                      <div key={step.id || idx} className="admin-step-card">
                        <span className="admin-step-card__num">Langkah {step.stepNumber}</span>
                        <div className="admin-field">
                          <label htmlFor={`step-title-${idx}`} className="admin-label">
                            Judul
                          </label>
                          <input
                            id={`step-title-${idx}`}
                            type="text"
                            className={`admin-input ${errors[`step-${idx}-title`] ? 'is-error' : ''}`}
                            value={step.title}
                            onChange={(e) => handleStepField(idx, 'title', e.target.value)}
                          />
                          {errors[`step-${idx}-title`] && (
                            <p className="admin-field__error" role="alert">
                              {errors[`step-${idx}-title`]}
                            </p>
                          )}
                        </div>
                        <div className="admin-field">
                          <label htmlFor={`step-desc-${idx}`} className="admin-label">
                            Deskripsi
                          </label>
                          <textarea
                            id={`step-desc-${idx}`}
                            rows={2}
                            className={`admin-textarea ${errors[`step-${idx}-description`] ? 'is-error' : ''}`}
                            value={step.description}
                            onChange={(e) => handleStepField(idx, 'description', e.target.value)}
                          />
                          {errors[`step-${idx}-description`] && (
                            <p className="admin-field__error" role="alert">
                              {errors[`step-${idx}-description`]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-tab-footer">
                  <p className="admin-tab-footer__meta">{lastEditedCaption}</p>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    disabled={savingTab === 'konten'}
                  >
                    {savingTab === 'konten' ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: TAUTAN LAPORAN (KHUSUS OWNER) */}
          {activeTab === 'laporan' && isOwner && (
            <form
              className="admin-panel admin-panel--padded"
              role="tabpanel"
              aria-label="Pengaturan Tautan Laporan"
              onSubmit={handleSaveAnalytics}
              noValidate
            >
              <div className="admin-form">
                <div className="admin-field">
                  <label htmlFor="set-ga4" className="admin-label">
                    Tautan Google Analytics 4 (GA4)
                  </label>
                  <input
                    id="set-ga4"
                    type="url"
                    className={`admin-input ${errors.ga4Url ? 'is-error' : ''}`}
                    value={settings.analytics.ga4Url}
                    onChange={(e) => handleAnalyticsField('ga4Url', e.target.value)}
                    placeholder="https://analytics.google.com/analytics/web/..."
                  />
                  <p className="admin-field__help">
                    Dipakai pada tombol &quot;Buka laporan di Google Analytics ↗&quot; di menu Laporan.
                  </p>
                  {errors.ga4Url && (
                    <p className="admin-field__error" role="alert">{errors.ga4Url}</p>
                  )}
                </div>

                <div className="admin-field">
                  <label htmlFor="set-looker" className="admin-label">
                    Tautan Sematan Looker Studio (opsional)
                  </label>
                  <input
                    id="set-looker"
                    type="url"
                    className={`admin-input ${errors.lookerEmbedUrl ? 'is-error' : ''}`}
                    value={settings.analytics.lookerEmbedUrl}
                    onChange={(e) => handleAnalyticsField('lookerEmbedUrl', e.target.value)}
                    placeholder="https://lookerstudio.google.com/embed/reporting/..."
                  />
                  <p className="admin-field__help">
                    Bila diisi, laporan akan disematkan langsung di dalam halaman Laporan khusus Owner.
                  </p>
                  {errors.lookerEmbedUrl && (
                    <p className="admin-field__error" role="alert">{errors.lookerEmbedUrl}</p>
                  )}
                </div>

                <div className="admin-tab-footer">
                  <p className="admin-tab-footer__meta">{lastEditedCaption}</p>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    disabled={savingTab === 'laporan'}
                  >
                    {savingTab === 'laporan' ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

