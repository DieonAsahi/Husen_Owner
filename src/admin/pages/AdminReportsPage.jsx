import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminOwnerGuard from '../components/AdminOwnerGuard';
import StatusDot from '../components/StatusDot';
import { getSiteSettingsAdmin } from '../services/adminStudioStore';

function ReportsContent() {
  const [searchParams] = useSearchParams();
  const stateOverride = import.meta.env.DEV ? searchParams.get('state') : null;
  const [reloadTick, setReloadTick] = useState(0);

  const [state, setState] = useState({
    status: 'loading',
    ga4Url: '',
    lookerEmbedUrl: '',
    error: '',
  });

  useEffect(() => {
    if (stateOverride === 'loading') return undefined;
    let cancelled = false;
    getSiteSettingsAdmin({ simulateState: stateOverride === 'error' ? 'error' : null })
      .then((data) => {
        if (cancelled) return;
        if (stateOverride === 'empty') {
          setState({ status: 'ready', ga4Url: '', lookerEmbedUrl: '', error: '' });
          return;
        }
        setState({
          status: 'ready',
          ga4Url: String(data.analytics?.ga4Url || '').trim(),
          lookerEmbedUrl: String(data.analytics?.lookerEmbedUrl || '').trim(),
          error: '',
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: 'error',
            ga4Url: '',
            lookerEmbedUrl: '',
            error: err?.message || 'Gagal memuat konfigurasi laporan.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stateOverride, reloadTick]);

  const isLoading = stateOverride === 'loading' || state.status === 'loading';
  const isError = stateOverride !== 'loading' && state.status === 'error';
  const hasAnyLink = Boolean(state.ga4Url || state.lookerEmbedUrl);

  return (
    <div className="admin-entity-page">
      <header className="admin-list-header">
        <div className="admin-list-header__title-wrap">
          <h2 className="admin-list-header__heading">Laporan Pengunjung</h2>
        </div>
        {state.ga4Url && (
          <a
            href={state.ga4Url}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn admin-btn--primary"
          >
            Buka laporan di Google Analytics ↗
          </a>
        )}
      </header>

      <p className="admin-report-intro">
        Pantau metrik kunjungan publik dan sumber trafik pameran studio melalui tautan analitik resmi milik Owner.
      </p>

      {isError && (
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT LAPORAN" tone="danger" />
            <p className="admin-state-box__msg">{state.error}</p>
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
        <section className="admin-panel" aria-label="Memuat tautan laporan">
          <div className="admin-skeleton-rows">
            <div className="admin-skeleton admin-skeleton--title" />
            <div className="admin-skeleton admin-skeleton--meta" />
          </div>
        </section>
      )}

      {!isLoading && !isError && !hasAnyLink && (
        <section className="admin-panel">
          <div className="admin-empty-row">
            <StatusDot label="TAUTAN BELUM DIATUR" tone="warning" />
            <p>
              Tautan Google Analytics 4 atau Looker Studio belum dikonfigurasi oleh Owner.
            </p>
            <Link to="/pengaturan?tab=laporan" className="admin-btn admin-btn--primary">
              Buka Pengaturan Situs →
            </Link>
          </div>
        </section>
      )}

      {!isLoading && !isError && hasAnyLink && (
        <div className="admin-form">
          {state.ga4Url && !state.lookerEmbedUrl && (
            <section className="admin-panel admin-panel--padded">
              <div className="admin-owner-strip">
                <div className="admin-owner-strip__info">
                  <h3 className="admin-owner-strip__title">Google Analytics 4 Tersambung</h3>
                  <p className="admin-owner-strip__desc">{state.ga4Url}</p>
                </div>
                <Link to="/pengaturan?tab=laporan" className="admin-btn admin-btn--secondary">
                  Ubah tautan
                </Link>
              </div>
            </section>
          )}

          {state.lookerEmbedUrl && (
            <section className="admin-panel">
              <div className="admin-panel__head admin-panel__head--split">
                <h3 className="admin-panel__subhead">Ringkasan Looker Studio</h3>
                <Link to="/pengaturan?tab=laporan" className="admin-text-link admin-text-link--sm">
                  Atur tautan
                </Link>
              </div>
              <div className="admin-report-embed-wrap">
                <iframe
                  title="Laporan Pengunjung Looker Studio"
                  src={state.lookerEmbedUrl}
                  className="admin-report-iframe"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <AdminOwnerGuard sectionTitle="Laporan">
      <ReportsContent />
    </AdminOwnerGuard>
  );
}

