import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useConfirm, useToast } from '../context/adminContexts';
import { ADMIN_PAGE_SIZE } from '../services/adminContentStore';
import {
  formatRelativeTimeId,
  mapAvailabilityBadge,
  mapPublishBadge,
} from '../services/adminApi';
import StatusDot from './StatusDot';
import AdminPagination from './AdminPagination';
import { IconSearch, IconMore } from './AdminIcons';

export default function AdminEntityList({
  entityType = 'karya', // 'karya' | 'pameran'
  headingTitle,
  addLabel,
  addPath,
  publicBasePath,
  editBasePath,
  sortOptions,
  fetchList,
  onToggleArchive,
}) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const stateOverride = import.meta.env.DEV ? searchParams.get('state') : null; // 'loading' | 'empty' | 'error'
  const pageParam = Math.max(1, Number(searchParams.get('page')) || 1);

  const [search, setSearch] = useState('');
  const [publishFilter, setPublishFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState(sortOptions[0].value);
  const [reloadTick, setReloadTick] = useState(0);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [state, setState] = useState({
    status: 'loading',
    items: [],
    total: 0,
    totalPages: 1,
    page: 1,
    error: '',
  });

  const menuRootRef = useRef(null);
  const publicSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');

  useEffect(() => {
    if (!openMenuId) return;
    const handleOutside = (e) => {
      if (menuRootRef.current && !menuRootRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [openMenuId]);

  const loadData = useCallback(async () => {
    const sim = stateOverride === 'empty' ? 'empty' : stateOverride === 'error' ? 'error' : null;
    try {
      const res = await fetchList({
        search,
        publishFilter,
        availabilityFilter,
        sortBy,
        page: pageParam,
        pageSize: ADMIN_PAGE_SIZE,
        simulateState: sim,
      });
      return {
        status: 'success',
        items: res.items,
        total: res.total,
        totalPages: res.totalPages,
        page: res.page,
        error: '',
      };
    } catch (err) {
      return {
        status: 'error',
        items: [],
        total: 0,
        totalPages: 1,
        page: 1,
        error: err?.message || 'Gagal memuat daftar.',
      };
    }
  }, [fetchList, search, publishFilter, availabilityFilter, sortBy, pageParam, stateOverride]);

  useEffect(() => {
    if (stateOverride === 'loading') return undefined;
    let cancelled = false;
    loadData().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [loadData, stateOverride, reloadTick]);

  const handlePageChange = (nextPage) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage <= 1) nextParams.delete('page');
    else nextParams.set('page', String(nextPage));
    setSearchParams(nextParams);
  };

  const handleFilterReset = () => {
    setSearch('');
    setPublishFilter('ALL');
    setAvailabilityFilter('ALL');
    handlePageChange(1);
  };

  const handleArchiveAction = async (item) => {
    setOpenMenuId(null);
    const isArchived = item.publishStatus === 'ARCHIVED';
    const nextStatus = isArchived ? 'PUBLISHED' : 'ARCHIVED';

    const agreed = await confirm({
      title: isArchived ? `Pulihkan ${headingTitle}?` : `Arsipkan ${headingTitle}?`,
      message: isArchived
        ? `"${item.title}" akan kembali berstatus Terbit dan dapat dilihat pada situs publik.`
        : `"${item.title}" tidak lagi tampil di situs publik dan dipindahkan ke status Diarsipkan.`,
      confirmLabel: isArchived ? 'Pulihkan ke Terbit' : 'Arsipkan',
      cancelLabel: 'Batal',
      destructive: !isArchived,
    });

    if (!agreed) return;

    try {
      await onToggleArchive(item.id, nextStatus);
      showToast({
        message: isArchived
          ? `"${item.title}" dipulihkan ke Terbit.`
          : `"${item.title}" dipindahkan ke Arsip.`,
        tone: 'success',
      });
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast({
        message: err?.message || 'Gagal memperbarui status.',
        tone: 'error',
      });
    }
  };

  const isLoading = stateOverride === 'loading' || state.status === 'loading';
  const isError = stateOverride !== 'loading' && state.status === 'error';
  const hasFilters = Boolean(search.trim() || publishFilter !== 'ALL' || availabilityFilter !== 'ALL');

  return (
    <div className="admin-entity-page" ref={menuRootRef}>
      {/* Header Judul + Jumlah + Tombol Tambah */}
      <header className="admin-list-header">
        <div className="admin-list-header__title-wrap">
          <h2 className="admin-list-header__heading">{headingTitle}</h2>
          <span className="admin-list-header__count" aria-label={`Total ${state.total} item`}>
            {isLoading ? '—' : state.total}
          </span>
        </div>

        <Link to={addPath} className="admin-btn admin-btn--primary">
          {addLabel}
        </Link>
      </header>

      {/* Bilah Alat: Cari, Filter Status Publikasi, Ketersediaan (Karya), Urutkan */}
      <section className="admin-toolbar" aria-label="Bilah pencarian dan penyaringan">
        <div className="admin-toolbar__search">
          <label htmlFor={`search-${entityType}`} className="admin-sr-only">
            Cari {headingTitle}
          </label>
          <span className="admin-toolbar__search-icon" aria-hidden="true">
            <IconSearch size={16} />
          </span>
          <input
            id={`search-${entityType}`}
            type="search"
            className="admin-input admin-input--search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handlePageChange(1);
            }}
            placeholder={
              entityType === 'karya'
                ? 'Cari judul, slug, atau tahun...'
                : entityType === 'artikel'
                  ? 'Cari judul, kategori, atau slug...'
                  : 'Cari judul, venue, atau kota...'
            }
          />
        </div>

        <div className="admin-toolbar__filters">
          <div className="admin-toolbar__select-group">
            <label htmlFor={`pub-filter-${entityType}`} className="admin-sr-only">
              Status publikasi
            </label>
            <select
              id={`pub-filter-${entityType}`}
              className="admin-select"
              value={publishFilter}
              onChange={(e) => {
                setPublishFilter(e.target.value);
                handlePageChange(1);
              }}
            >
              <option value="ALL">Status: Semua</option>
              <option value="PUBLISHED">Terbit</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Diarsipkan</option>
            </select>
          </div>

          {entityType === 'karya' && (
            <div className="admin-toolbar__select-group">
              <label htmlFor="avail-filter-karya" className="admin-sr-only">
                Filter ketersediaan
              </label>
              <select
                id="avail-filter-karya"
                className="admin-select"
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(e.target.value);
                  handlePageChange(1);
                }}
              >
                <option value="ALL">Ketersediaan: Semua</option>
                <option value="AVAILABLE">Tersedia</option>
                <option value="SOLD">Terjual</option>
                <option value="PRIVATE_COLLECTION">Koleksi Pribadi</option>
              </select>
            </div>
          )}

          <div className="admin-toolbar__select-group">
            <label htmlFor={`sort-${entityType}`} className="admin-sr-only">
              Urutkan
            </label>
            <select
              id={`sort-${entityType}`}
              className="admin-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Keadaan Galat */}
      {isError && (
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT DATA" tone="danger" />
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

      {/* Keadaan Memuat (Rangka Sederhana) */}
      {!isError && isLoading && (
        <section className="admin-panel" aria-label="Memuat daftar">
          <div className="admin-skeleton-rows">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div key={idx} className="admin-skeleton-row admin-skeleton-row--table">
                <div className="admin-skeleton admin-skeleton--thumb" />
                <div className="admin-skeleton-row__lines">
                  <div className="admin-skeleton admin-skeleton--title" />
                  <div className="admin-skeleton admin-skeleton--meta" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Keadaan Kosong */}
      {!isError && !isLoading && state.items.length === 0 && (
        <section className="admin-panel">
          <div className="admin-empty-row">
            <p>
              {hasFilters
                ? `Tidak ada ${headingTitle.toLowerCase()} yang cocok dengan penyaringan saat ini.`
                : `Belum ada data ${headingTitle.toLowerCase()}.`}
            </p>
            <div className="admin-empty-actions">
              {hasFilters && (
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={handleFilterReset}
                >
                  Atur ulang filter
                </button>
              )}
              <Link to={addPath} className="admin-btn admin-btn--primary">
                {addLabel}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tabel Desktop (>= 768px) & Daftar Bertumpuk Ponsel (<= 767px) */}
      {!isError && !isLoading && state.items.length > 0 && (
        <>
          <section className="admin-panel admin-table-panel">
            {/* Desktop Table */}
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-table__th-thumb">Foto</th>
                  <th>Judul</th>
                  {entityType === 'karya' && (
                    <>
                      <th>Tahun</th>
                      <th>Ukuran</th>
                      <th>Ketersediaan</th>
                    </>
                  )}
                  {entityType === 'pameran' && (
                    <>
                      <th>Tahun</th>
                      <th>Penyelenggaraan</th>
                    </>
                  )}
                  {entityType === 'artikel' && (
                    <>
                      <th>Kategori</th>
                      <th>Waktu baca</th>
                    </>
                  )}
                  <th>Publikasi</th>
                  <th>Terakhir diubah</th>
                  <th className="admin-table__th-actions">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item) => {
                  const thumbUrl = item.images?.[0]?.url || '';
                  const pubBadge = mapPublishBadge(item.publishStatus);
                  const availBadge = entityType === 'karya' ? mapAvailabilityBadge(item.availability) : null;
                  const yearDisplay =
                    entityType === 'karya'
                      ? item.year
                      : item.startDate
                        ? item.startDate.slice(0, 4)
                        : '—';
                  const menuOpen = openMenuId === item.id;

                  return (
                    <tr key={item.id}>
                      <td>
                        <Link
                          to={`${editBasePath}/${item.slug}`}
                          className="admin-table__thumb-link"
                          aria-label={`Ubah ${item.title}`}
                        >
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt=""
                              className="admin-table__thumb"
                              style={
                                entityType === 'pameran' && item.focalPoint
                                  ? { objectPosition: item.focalPoint }
                                  : undefined
                              }
                            />
                          ) : (
                            <span className="admin-table__thumb-empty" aria-hidden="true">
                              —
                            </span>
                          )}
                        </Link>
                      </td>
                      <td>
                        <div className="admin-table__title-cell">
                          <Link
                            to={`${editBasePath}/${item.slug}`}
                            className="admin-list-row__title"
                          >
                            {item.title}
                          </Link>
                          <span className="admin-table__slug">/{item.slug}</span>
                        </div>
                      </td>
                      {entityType === 'karya' && (
                        <>
                          <td className="admin-table__cell-nowrap">{yearDisplay}</td>
                          <td className="admin-table__cell-nowrap">{item.dimensions || '—'}</td>
                          <td className="admin-table__cell-nowrap">
                            <StatusDot label={availBadge.label} tone={availBadge.tone} />
                          </td>
                        </>
                      )}
                      {entityType === 'pameran' && (
                        <>
                          <td className="admin-table__cell-nowrap">{yearDisplay}</td>
                          <td>
                            <div className="admin-table__venue-cell">
                              <span>{item.type === 'SOLO' ? 'Pameran Tunggal' : 'Pameran Bersama'}</span>
                              <span className="admin-table__slug">{item.venue}</span>
                            </div>
                          </td>
                        </>
                      )}
                      {entityType === 'artikel' && (
                        <>
                          <td>
                            <div className="admin-table__venue-cell">
                              <span>{item.category || '—'}</span>
                              <span className="admin-table__slug">{item.author || 'Husen Nursidik'}</span>
                            </div>
                          </td>
                          <td className="admin-table__cell-nowrap">
                            {item.readingMinutes ? `${item.readingMinutes} menit` : '—'}
                          </td>
                        </>
                      )}
                      <td className="admin-table__cell-nowrap">
                        <StatusDot label={pubBadge.label} tone={pubBadge.tone} />
                      </td>
                      <td className="admin-table__cell-nowrap">
                        <span className="admin-list-row__time">
                          {formatRelativeTimeId(item.updatedAt)}
                        </span>
                      </td>
                      <td className="admin-table__td-actions">
                        <div className="admin-row-action-wrap">
                          <button
                            type="button"
                            className="admin-icon-btn"
                            aria-label={`Menu aksi untuk ${item.title}`}
                            aria-expanded={menuOpen}
                            aria-haspopup="menu"
                            onClick={() => setOpenMenuId(menuOpen ? null : item.id)}
                          >
                            <IconMore size={18} />
                          </button>
                          {menuOpen && (
                            <div className="admin-action-menu" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                className="admin-action-menu__item"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`${editBasePath}/${item.slug}`);
                                }}
                              >
                                Ubah
                              </button>
                              {publicSiteUrl && (
                                <a
                                  role="menuitem"
                                  href={`${publicSiteUrl}${publicBasePath}/${item.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-action-menu__item"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  Lihat di situs ↗
                                </a>
                              )}
                              <div className="admin-action-menu__divider" />
                              <button
                                type="button"
                                role="menuitem"
                                className={`admin-action-menu__item ${item.publishStatus === 'ARCHIVED' ? '' : 'is-danger'}`}
                                onClick={() => handleArchiveAction(item)}
                              >
                                {item.publishStatus === 'ARCHIVED' ? 'Pulihkan' : 'Arsipkan'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Mobile Stacked List (<= 767px, bukan tabel horizontal) */}
          <ul className="admin-mobile-list" aria-label={`Daftar ${headingTitle}`}>
              {state.items.map((item) => {
                const thumbUrl = item.images?.[0]?.url || '';
                const pubBadge = mapPublishBadge(item.publishStatus);
                const availBadge = entityType === 'karya' ? mapAvailabilityBadge(item.availability) : null;

                return (
                  <li key={item.id} className="admin-mobile-row">
                    <div className="admin-mobile-row__top">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt=""
                          className="admin-table__thumb"
                          style={
                            entityType === 'pameran' && item.focalPoint
                              ? { objectPosition: item.focalPoint }
                              : undefined
                          }
                        />
                      ) : (
                        <span className="admin-table__thumb-empty" aria-hidden="true">
                          —
                        </span>
                      )}

                      <div className="admin-mobile-row__info">
                        <Link
                          to={`${editBasePath}/${item.slug}`}
                          className="admin-list-row__title"
                        >
                          {item.title}
                        </Link>
                        <div className="admin-mobile-row__badges">
                          {availBadge && (
                            <StatusDot label={availBadge.label} tone={availBadge.tone} />
                          )}
                          <StatusDot label={pubBadge.label} tone={pubBadge.tone} />
                        </div>
                      </div>
                    </div>

                    <div className="admin-mobile-row__actions">
                      <Link
                        to={`${editBasePath}/${item.slug}`}
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                      >
                        Ubah
                      </Link>
                      {publicSiteUrl && (
                        <a
                          href={`${publicSiteUrl}${publicBasePath}/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn admin-btn--secondary admin-btn--sm"
                        >
                          Lihat di situs ↗
                        </a>
                      )}
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                        onClick={() => handleArchiveAction(item)}
                      >
                        {item.publishStatus === 'ARCHIVED' ? 'Pulihkan' : 'Arsipkan'}
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>

          <AdminPagination
            page={state.page}
            totalPages={state.totalPages}
            total={state.total}
            pageSize={ADMIN_PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

