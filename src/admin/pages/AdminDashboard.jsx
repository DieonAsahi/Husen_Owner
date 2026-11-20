import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuth, useToast } from '../context/adminContexts';
import { getDashboardSummary } from '../services/adminApi';
import StatusDot from '../components/StatusDot';

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const stateOverride = import.meta.env.DEV ? searchParams.get('state') : null; // 'loading' | 'empty' | 'error' | null

  const [requestCount, setRequestCount] = useState(0);
  const [state, setState] = useState({
    status: 'loading', // 'loading' | 'success' | 'error'
    data: null,
    error: '',
  });

  const loadData = useCallback(async () => {
    const sim = stateOverride === 'empty' ? 'empty' : stateOverride === 'error' ? 'error' : null;
    try {
      const summary = await getDashboardSummary({ simulateState: sim });
      return { status: 'success', data: summary, error: '' };
    } catch (err) {
      return {
        status: 'error',
        data: null,
        error: err?.message || 'Gagal memuat data dashboard.',
      };
    }
  }, [stateOverride]);

  useEffect(() => {
    if (stateOverride === 'loading') return undefined;

    let cancelled = false;
    loadData().then((nextState) => {
      if (!cancelled) {
        setState(nextState);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadData, stateOverride, requestCount]);

  const handleRetry = () => {
    setState({ status: 'loading', data: null, error: '' });
    setRequestCount((c) => c + 1);
    showToast({ message: 'Memuat ulang ringkasan studio...', tone: 'warning', duration: 2500 });
  };

  const isLoading = stateOverride === 'loading' || state.status === 'loading';
  const isError = stateOverride !== 'loading' && state.status === 'error';
  const summary = state.data;
  const isOwner = user?.role === 'OWNER';

  return (
    <div className="admin-dashboard">
      {/* Salam & Tombol Cepat */}
      <section className="admin-dash-header" aria-labelledby="dash-greeting">
        <div className="admin-dash-header__text">
          <h2 id="dash-greeting" className="admin-dash-greeting">
            Selamat datang, {user?.name || 'Admin'}
          </h2>
          <p className="admin-dash-caption">
            Ringkasan arsip publikasi dan catatan kelengkapan konten studio.
          </p>
        </div>

        <div className="admin-quick-actions" aria-label="Tindakan cepat tambah konten">
          <Link to="/karya/baru" className="admin-btn admin-btn--primary">
            + Karya
          </Link>
          <Link to="/pameran/baru" className="admin-btn admin-btn--secondary">
            + Pameran
          </Link>
          <Link to="/artikel/baru" className="admin-btn admin-btn--secondary">
            + Artikel
          </Link>
        </div>
      </section>

      {/* Keadaan Galat Global Dashboard */}
      {isError && (
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT DATA" tone="danger" />
            <p className="admin-state-box__msg">{state.error}</p>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={handleRetry}>
              Muat ulang
            </button>
          </div>
        </section>
      )}

      {/* Empat Angka Tipografi dengan Garis Pemisah Tipis (Bukan Kartu Berwarna) */}
      {!isError && (
        <section className="admin-metrics-strip" aria-label="Statistik konten">
          {isLoading ? (
            [0, 1, 2, 3].map((idx) => (
              <div key={idx} className="admin-metric-item">
                <div className="admin-skeleton admin-skeleton--num" />
                <div className="admin-skeleton admin-skeleton--label" />
              </div>
            ))
          ) : (
            <>
              <div className="admin-metric-item">
                <span className="admin-metric-item__value">
                  {summary?.counts.karyaPublished ?? 0}
                </span>
                <span className="admin-metric-item__label">Karya terbit</span>
              </div>
              <div className="admin-metric-item">
                <span className="admin-metric-item__value">
                  {summary?.counts.pameranPublished ?? 0}
                </span>
                <span className="admin-metric-item__label">Pameran terbit</span>
              </div>
              <div className="admin-metric-item">
                <span className="admin-metric-item__value">
                  {summary?.counts.artikelPublished ?? 0}
                </span>
                <span className="admin-metric-item__label">Artikel terbit</span>
              </div>
              <div className="admin-metric-item">
                <span className="admin-metric-item__value">
                  {summary?.counts.draftWaiting ?? 0}
                </span>
                <span className="admin-metric-item__label">Draft menunggu</span>
              </div>
            </>
          )}
        </section>
      )}

      {/* Kolom Ganda Konten: Terakhir Diubah & Perlu Perhatian */}
      {!isError && (
        <div className="admin-dash-grid">
          {/* Terakhir Diubah (5 Baris) */}
          <section className="admin-panel" aria-labelledby="sec-recent">
            <div className="admin-panel__head">
              <h3 id="sec-recent" className="admin-panel__title">
                Terakhir diubah
              </h3>
            </div>

            {isLoading ? (
              <div className="admin-skeleton-rows">
                {[0, 1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="admin-skeleton-row">
                    <div className="admin-skeleton admin-skeleton--title" />
                    <div className="admin-skeleton admin-skeleton--meta" />
                  </div>
                ))}
              </div>
            ) : !summary || summary.recentChanges.length === 0 ? (
              <div className="admin-empty-row">
                <p>Belum ada data konten yang diubah.</p>
                <Link to="/karya?baru=1" className="admin-text-link">
                  Tambah karya pertama →
                </Link>
              </div>
            ) : (
              <ul className="admin-list-rows">
                {summary.recentChanges.map((item) => (
                  <li key={`${item.jenis}-${item.id}`} className="admin-list-row">
                    <div className="admin-list-row__main">
                      <Link to={item.editPath} className="admin-list-row__title">
                        {item.title}
                      </Link>
                      <span className="admin-list-row__type">{item.jenis}</span>
                    </div>
                    <div className="admin-list-row__meta">
                      <StatusDot label={item.status.label} tone={item.status.tone} />
                      <span className="admin-list-row__time">{item.relativeTime}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Perlu Perhatian */}
          <section className="admin-panel" aria-labelledby="sec-attention">
            <div className="admin-panel__head">
              <h3 id="sec-attention" className="admin-panel__title">
                Perlu perhatian
              </h3>
            </div>

            {isLoading ? (
              <div className="admin-skeleton-rows">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="admin-skeleton-row">
                    <div className="admin-skeleton admin-skeleton--title" />
                    <div className="admin-skeleton admin-skeleton--meta" />
                  </div>
                ))}
              </div>
            ) : !summary || summary.attentionItems.length === 0 ? (
              <div className="admin-empty-row">
                <StatusDot label="SEMUA LENGKAP" tone="success" />
                <p>Tidak ada foto atau draft yang memerlukan perhatian saat ini.</p>
              </div>
            ) : (
              <ul className="admin-list-rows">
                {summary.attentionItems.map((att) => (
                  <li key={att.id} className="admin-list-row admin-list-row--attention">
                    <div className="admin-list-row__main">
                      <div className="admin-attention__status">
                        <StatusDot label={att.issue.toUpperCase()} tone={att.tone} />
                        <span className="admin-list-row__type">{att.jenis}</span>
                      </div>
                      <span className="admin-attention__title">{att.title}</span>
                      <span className="admin-attention__detail">{att.detail}</span>
                    </div>
                    <div className="admin-list-row__action">
                      <Link to={att.fixPath} className="admin-fix-link">
                        Perbaiki
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Baris Khusus Owner: Laporan Pengunjung */}
      {!isError && isOwner && (
        <section className="admin-owner-strip" aria-label="Laporan pengunjung khusus owner">
          <div className="admin-owner-strip__info">
            <span className="admin-owner-strip__title">Laporan pengunjung</span>
            <span className="admin-owner-strip__desc">
              Ringkasan kunjungan situs publik dan halaman karya terpopuler.
            </span>
          </div>
          <Link to="/owner/laporan" className="admin-btn admin-btn--secondary">
            Buka laporan ↗
          </Link>
        </section>
      )}
    </div>
  );
}

