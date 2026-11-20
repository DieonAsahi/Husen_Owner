import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth, useConfirm, useToast } from '../context/adminContexts';
import {
  IconDashboard,
  IconKarya,
  IconPameran,
  IconArtikel,
  IconSettings,
  IconUsers,
  IconLog,
  IconReport,
  IconMenu,
  IconClose,
  IconChevronDown,
} from './AdminIcons';

const STANDARD_LINKS = [
  { to: '/', end: true, label: 'Dashboard', icon: IconDashboard },
  { to: '/karya', label: 'Karya', icon: IconKarya },
  { to: '/pameran', label: 'Pameran', icon: IconPameran },
  { to: '/artikel', label: 'Artikel', icon: IconArtikel },
  { to: '/pengaturan', label: 'Pengaturan Situs', icon: IconSettings },
];

const OWNER_LINKS = [
  { to: '/owner/pengguna', label: 'Pengguna', icon: IconUsers },
  { to: '/owner/log', label: 'Log Aktivitas', icon: IconLog },
  { to: '/owner/laporan', label: 'Laporan', icon: IconReport },
];

export default function AdminLayout({ pageTitle = 'Dashboard', children }) {
  const { user, logout } = useAdminAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);

  const userMenuRef = useRef(null);
  const drawerCloseRef = useRef(null);
  const menuBtnRef = useRef(null);

  // Tutup laci & menu pengguna saat berpindah rute (pola React render-time)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }

  // Tutup user menu jika klik di luar atau tekan Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [userMenuOpen]);

  // Kelola fokus & Escape pada drawer mobile
  useEffect(() => {
    if (!drawerOpen) return;
    const raf = window.requestAnimationFrame(() => {
      drawerCloseRef.current?.focus();
    });
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        menuBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKey);
    };
  }, [drawerOpen]);

  const handleLogoutClick = async () => {
    setUserMenuOpen(false);
    const agreed = await confirm({
      title: 'Keluar dari Panel Admin?',
      message: 'Sesi Anda akan diakhiri dan Anda harus masuk kembali untuk mengelola arsip studio.',
      confirmLabel: 'Keluar',
      cancelLabel: 'Batal',
      destructive: true,
    });

    if (agreed) {
      logout();
      showToast({ message: 'Anda telah keluar dari panel admin.', tone: 'success' });
      navigate('/login', { replace: true });
    }
  };

  const isOwner = user?.role === 'OWNER';
  const publicSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  const initials = (user?.name || 'HN')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="admin-shell">
      {/* Backdrop Laci Mobile */}
      {drawerOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Kiri (240px Desktop, 72px Ikon Tablet 1024, Laci Mobile) */}
      <aside
        className={`admin-sidebar ${drawerOpen ? 'is-drawer-open' : ''}`}
        aria-label="Navigasi Panel Admin"
      >
        <div className="admin-sidebar__brand">
          <Link to="/" className="admin-brand" aria-label="Husen Nursidik — House of Art">
            <span className="admin-brand__full">
              <span className="admin-brand__script">Husen Nursidik</span>
              <span className="admin-brand__sub">HOUSE OF ART</span>
            </span>
            <span className="admin-brand__compact" aria-hidden="true">
              <span className="admin-brand__compact-serif">HN</span>
            </span>
          </Link>
          <button
            ref={drawerCloseRef}
            type="button"
            className="admin-sidebar__close"
            onClick={() => {
              setDrawerOpen(false);
              menuBtnRef.current?.focus();
            }}
            aria-label="Tutup menu navigasi"
          >
            <IconClose size={20} />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          <ul className="admin-nav-list">
            {STANDARD_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={item.label}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      `admin-nav-link ${isActive ? 'is-active' : ''}`
                    }
                  >
                    <Icon size={18} />
                    <span className="admin-nav-link__label">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {isOwner && (
            <div className="admin-nav-group">
              <div className="admin-nav-group__header">
                <span className="admin-nav-group__title">KHUSUS OWNER</span>
              </div>
              <ul className="admin-nav-list">
                {OWNER_LINKS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        title={item.label}
                        aria-label={item.label}
                        className={({ isActive }) =>
                          `admin-nav-link ${isActive ? 'is-active' : ''}`
                        }
                      >
                        <Icon size={18} />
                        <span className="admin-nav-link__label">{item.label}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>
      </aside>

      {/* Area Utama: Bilah Atas + Konten */}
      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <button
              ref={menuBtnRef}
              type="button"
              className="admin-topbar__menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              aria-expanded={drawerOpen}
            >
              <IconMenu size={20} />
            </button>
            <h1 className="admin-topbar__title">{pageTitle}</h1>
          </div>

          <div className="admin-topbar__right">
            {publicSiteUrl ? (
              <a
                href={publicSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-topbar__site-link"
              >
                Lihat situs ↗
              </a>
            ) : null}

            <div className="admin-user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="admin-user-menu__trigger"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={`Menu pengguna ${user?.name || ''}, peran ${user?.role || ''}`}
              >
                <span className="admin-user-menu__initials" aria-hidden="true">
                  {initials}
                </span>
                <span className="admin-user-menu__name">{user?.name}</span>
                <span className="admin-role-badge">{user?.role}</span>
                <IconChevronDown size={14} />
              </button>

              {userMenuOpen && (
                <div className="admin-user-menu__dropdown" role="menu">
                  <div className="admin-user-menu__info">
                    <div className="admin-user-menu__info-row">
                      <span className="admin-user-menu__info-name">{user?.name}</span>
                      <span className="admin-role-badge">{user?.role}</span>
                    </div>
                    <span className="admin-user-menu__info-email">{user?.email}</span>
                  </div>
                  <div className="admin-user-menu__divider" />
                  <button
                    type="button"
                    role="menuitem"
                    className="admin-user-menu__logout"
                    onClick={handleLogoutClick}
                  >
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main id="admin-main-content" className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

