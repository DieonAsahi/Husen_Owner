import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminOwnerGuard from '../components/AdminOwnerGuard';
import AdminPagination from '../components/AdminPagination';
import StatusDot from '../components/StatusDot';
import { formatRelativeTimeId } from '../services/adminApi';
import {
  listActivityLogsAdmin,
  LOGS_PAGE_SIZE,
} from '../services/adminStudioStore';

const ACTION_BADGE_MAP = {
  CREATE: { label: 'BUAT', tone: 'success' },
  UPDATE: { label: 'UBAH', tone: 'neutral' },
  PUBLISH: { label: 'TERBIT', tone: 'success' },
  ARCHIVE: { label: 'ARSIP', tone: 'warning' },
  DELETE: { label: 'HAPUS', tone: 'danger' },
  LOGIN: { label: 'MASUK', tone: 'neutral' },
};

function formatLogTimestamp(isoStr) {
  if (!isoStr) return '—';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoStr));
  } catch {
    return isoStr;
  }
}

function LogsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const stateOverride = import.meta.env.DEV ? searchParams.get('state') : null;
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);

  const [userFilter, setUserFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [state, setState] = useState({
    status: 'loading',
    items: [],
    total: 0,
    totalPages: 1,
    page: 1,
    users: [],
    error: '',
  });

  const loadLogs = useCallback(async () => {
    const sim = stateOverride === 'empty' ? 'empty' : stateOverride === 'error' ? 'error' : null;
    try {
      const res = await listActivityLogsAdmin({
        userFilter,
        actionFilter,
        typeFilter,
        dateFrom,
        dateTo,
        page: pageParam,
        pageSize: LOGS_PAGE_SIZE,
        simulateState: sim,
      });
      return {
        status: 'success',
        items: res.items,
        total: res.total,
        totalPages: res.totalPages,
        page: res.page,
        users: res.users,
        error: '',
      };
    } catch (err) {
      return {
        status: 'error',
        items: [],
        total: 0,
        totalPages: 1,
        page: 1,
        users: [],
        error: err?.message || 'Gagal memuat log aktivitas.',
      };
    }
  }, [userFilter, actionFilter, typeFilter, dateFrom, dateTo, pageParam, stateOverride]);

  useEffect(() => {
    if (stateOverride === 'loading') return undefined;
    let cancelled = false;
    loadLogs().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [loadLogs, stateOverride, reloadTick]);

  const handlePageChange = (nextPage) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage <= 1) nextParams.delete('page');
    else nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  const resetFilters = () => {
    setUserFilter('ALL');
    setActionFilter('ALL');
    setTypeFilter('ALL');
    setDateFrom('');
    setDateTo('');
    handlePageChange(1);
  };

  const isLoading = stateOverride === 'loading' || state.status === 'loading';
  const isError = stateOverride !== 'loading' && state.status === 'error';
  const hasFilters =
    userFilter !== 'ALL' || actionFilter !== 'ALL' || typeFilter !== 'ALL' || Boolean(dateFrom || dateTo);

  return (
    <div className="admin-entity-page">
      <header className="admin-list-header">
        <div className="admin-list-header__title-wrap">
          <h2 className="admin-list-header__heading">Log Aktivitas</h2>
          <span className="admin-list-header__count" aria-label={`Total ${state.total} catatan`}>
            {isLoading ? '—' : state.total}
          </span>
        </div>
        <StatusDot label="HANYA BACA · 25 BARIS / HALAMAN" tone="neutral" />
      </header>

      {/* Bilah Filter Log */}
      <section className="admin-log-filters" aria-label="Filter log aktivitas">
        <div className="admin-field">
          <label htmlFor="log-filter-user" className="admin-sr-only">Filter pengguna</label>
          <select
            id="log-filter-user"
            className="admin-select"
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              handlePageChange(1);
            }}
          >
            <option value="ALL">Pengguna: Semua</option>
            {state.users.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="admin-field">
          <label htmlFor="log-filter-action" className="admin-sr-only">Filter aksi</label>
          <select
            id="log-filter-action"
            className="admin-select"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              handlePageChange(1);
            }}
          >
            <option value="ALL">Aksi: Semua</option>
            <option value="CREATE">Buat</option>
            <option value="UPDATE">Ubah</option>
            <option value="PUBLISH">Terbit</option>
            <option value="ARCHIVE">Arsip</option>
            <option value="DELETE">Hapus</option>
            <option value="LOGIN">Masuk</option>
          </select>
        </div>

        <div className="admin-field">
          <label htmlFor="log-filter-type" className="admin-sr-only">Filter jenis item</label>
          <select
            id="log-filter-type"
            className="admin-select"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              handlePageChange(1);
            }}
          >
            <option value="ALL">Jenis: Semua</option>
            <option value="Karya">Karya</option>
            <option value="Pameran">Pameran</option>
            <option value="Artikel">Artikel</option>
            <option value="Pengaturan Situs">Pengaturan Situs</option>
            <option value="Pengguna">Pengguna</option>
            <option value="Sesi">Sesi</option>
          </select>
        </div>

        <div className="admin-log-dates">
          <input
            type="date"
            aria-label="Dari tanggal"
            className="admin-input"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              handlePageChange(1);
            }}
          />
          <span className="admin-log-dates__sep" aria-hidden="true">–</span>
          <input
            type="date"
            aria-label="Sampai tanggal"
            className="admin-input"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              handlePageChange(1);
            }}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={resetFilters}
          >
            Reset filter
          </button>
        )}
      </section>

      {isError && (
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT LOG" tone="danger" />
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
        <section className="admin-panel" aria-label="Memuat log aktivitas">
          <div className="admin-skeleton-rows">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="admin-skeleton-row">
                <div className="admin-skeleton admin-skeleton--title" />
                <div className="admin-skeleton admin-skeleton--meta" />
              </div>
            ))}
          </div>
        </section>
      )}

      {!isLoading && !isError && state.items.length === 0 && (
        <section className="admin-panel">
          <div className="admin-empty-row">
            <p>
              {hasFilters
                ? 'Tidak ada catatan log aktivitas yang cocok dengan filter.'
                : 'Belum ada catatan aktivitas yang terekam.'}
            </p>
            {hasFilters && (
              <button type="button" className="admin-btn admin-btn--secondary" onClick={resetFilters}>
                Tampilkan semua catatan
              </button>
            )}
          </div>
        </section>
      )}

      {!isLoading && !isError && state.items.length > 0 && (
        <>
          <section className="admin-panel admin-table-panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pengguna</th>
                  <th>Aksi</th>
                  <th>Jenis item</th>
                  <th>Judul item</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((log) => {
                  const badge = ACTION_BADGE_MAP[log.action] || { label: log.action, tone: 'neutral' };
                  return (
                    <tr key={log.id}>
                      <td className="admin-table__cell-nowrap">
                        <div className="admin-table__title-cell">
                          <span>{formatLogTimestamp(log.timestamp)}</span>
                          <span className="admin-table__slug">{formatRelativeTimeId(log.timestamp)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-table__venue-cell">
                          <span>{log.userName}</span>
                          <span className="admin-table__slug">{log.userRole}</span>
                        </div>
                      </td>
                      <td className="admin-table__cell-nowrap">
                        <StatusDot label={badge.label} tone={badge.tone} />
                      </td>
                      <td className="admin-table__cell-nowrap">{log.itemType}</td>
                      <td>{log.itemTitle}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <ul className="admin-mobile-list" aria-label="Daftar Log Aktivitas">
            {state.items.map((log) => {
              const badge = ACTION_BADGE_MAP[log.action] || { label: log.action, tone: 'neutral' };
              return (
                <li key={log.id} className="admin-mobile-row">
                  <div className="admin-mobile-row__info">
                    <div className="admin-mobile-row__badges">
                      <StatusDot label={badge.label} tone={badge.tone} />
                      <span className="admin-list-row__type">{log.itemType}</span>
                    </div>
                    <strong className="admin-log-item-title">{log.itemTitle}</strong>
                    <span className="admin-list-row__time">
                      {log.userName} · {formatLogTimestamp(log.timestamp)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          <AdminPagination
            page={state.page}
            totalPages={state.totalPages}
            total={state.total}
            pageSize={LOGS_PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

export default function AdminLogsPage() {
  return (
    <AdminOwnerGuard sectionTitle="Log Aktivitas">
      <LogsContent />
    </AdminOwnerGuard>
  );
}

