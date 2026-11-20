import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminOwnerGuard from '../components/AdminOwnerGuard';
import StatusDot from '../components/StatusDot';
import { IconMore } from '../components/AdminIcons';
import { useAdminAuth, useConfirm, useToast } from '../context/adminContexts';
import { formatRelativeTimeId } from '../services/adminApi';
import {
  listUsersAdmin,
  inviteUserAdmin,
  toggleUserActiveAdmin,
  resendInviteAdmin,
  resetUserPasswordAdmin,
} from '../services/adminStudioStore';

function mapUserStatusBadge(status) {
  if (status === 'ACTIVE') return { label: 'AKTIF', tone: 'success' };
  if (status === 'PENDING') return { label: 'UNDANGAN', tone: 'warning' };
  return { label: 'NONAKTIF', tone: 'neutral' };
}

function UsersContent() {
  const { user: currentUser } = useAdminAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const stateOverride = import.meta.env.DEV ? searchParams.get('state') : null;

  const menuRootRef = useRef(null);
  const inviteNameRef = useRef(null);

  const [state, setState] = useState({ status: 'loading', items: [], error: '' });
  const [reloadTick, setReloadTick] = useState(0);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'ADMIN' });
  const [inviteErrors, setInviteErrors] = useState({});
  const [inviting, setInviting] = useState(false);
  const [sentMessage, setSentMessage] = useState('');

  useEffect(() => {
    if (stateOverride === 'loading') return undefined;
    let cancelled = false;
    const sim = stateOverride === 'empty' ? 'empty' : stateOverride === 'error' ? 'error' : null;
    listUsersAdmin({ simulateState: sim })
      .then((items) => {
        if (!cancelled) setState({ status: 'success', items, error: '' });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: 'error', items: [], error: err?.message || 'Gagal memuat pengguna.' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stateOverride, reloadTick]);

  useEffect(() => {
    if (!openMenuId) return;
    const onOut = (e) => {
      if (menuRootRef.current && !menuRootRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', onOut);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOut);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!inviteOpen) return;
    const raf = window.requestAnimationFrame(() => inviteNameRef.current?.focus());
    const onKey = (e) => {
      if (e.key === 'Escape') setInviteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [inviteOpen]);

  const isSelfUser = (row) =>
    row.id === currentUser?.id || row.email.toLowerCase() === (currentUser?.email || '').toLowerCase();

  const openInviteDialog = () => {
    setInviteForm({ name: '', email: '', role: 'ADMIN' });
    setInviteErrors({});
    setInviteOpen(true);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    const nextErr = {};
    if (!inviteForm.name.trim()) nextErr.name = 'Nama pengguna wajib diisi.';
    if (!inviteForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email.trim())) {
      nextErr.email = 'Masukkan alamat surel yang valid.';
    }
    setInviteErrors(nextErr);
    if (Object.keys(nextErr).length > 0) return;

    setInviting(true);
    try {
      const invited = await inviteUserAdmin(inviteForm, currentUser);
      setInviteOpen(false);
      setSentMessage(`Undangan terkirim ke ${invited.email} sebagai ${invited.role}.`);
      showToast({ message: `Undangan terkirim ke ${invited.email}.`, tone: 'success' });
      setReloadTick((t) => t + 1);
    } catch (err) {
      setInviteErrors({ email: err?.message || 'Gagal mengirim undangan.' });
    } finally {
      setInviting(false);
    }
  };

  const handleToggleActive = async (row) => {
    setOpenMenuId(null);
    if (isSelfUser(row)) {
      showToast({ message: 'Anda tidak dapat menonaktifkan akun Anda sendiri.', tone: 'warning' });
      return;
    }

    const willDisable = row.status !== 'INACTIVE';
    const agreed = await confirm({
      title: willDisable ? `Nonaktifkan ${row.name}?` : `Aktifkan Kembali ${row.name}?`,
      message: willDisable
        ? `Akun ${row.email} tidak lagi dapat masuk ke panel studio sebelum diaktifkan kembali.`
        : `Akun ${row.email} akan kembali memperoleh akses ke panel studio.`,
      confirmLabel: willDisable ? 'Nonaktifkan' : 'Aktifkan',
      cancelLabel: 'Batal',
      destructive: willDisable,
    });
    if (!agreed) return;

    try {
      await toggleUserActiveAdmin(row.id, currentUser);
      showToast({
        message: willDisable
          ? `Akun ${row.name} telah dinonaktifkan.`
          : `Akun ${row.name} diaktifkan kembali.`,
        tone: 'success',
      });
      setReloadTick((t) => t + 1);
    } catch (err) {
      showToast({ message: err?.message || 'Gagal mengubah status pengguna.', tone: 'error' });
    }
  };

  const handleResendInvite = async (row) => {
    setOpenMenuId(null);
    try {
      await resendInviteAdmin(row.id, currentUser);
      showToast({ message: `Undangan dikirim ulang ke ${row.email}.`, tone: 'success' });
    } catch (err) {
      showToast({ message: err?.message || 'Gagal mengirim ulang undangan.', tone: 'error' });
    }
  };

  const handleResetPassword = async (row) => {
    setOpenMenuId(null);
    const agreed = await confirm({
      title: `Atur Ulang Kata Sandi ${row.name}?`,
      message: `Tautan pengaturan ulang kata sandi akan dikirim ke alamat surel ${row.email}.`,
      confirmLabel: 'Kirim Tautan',
      cancelLabel: 'Batal',
      destructive: false,
    });
    if (!agreed) return;

    try {
      await resetUserPasswordAdmin(row.id, currentUser);
      showToast({
        message: `Tautan atur ulang kata sandi dikirim ke ${row.email}.`,
        tone: 'success',
      });
    } catch (err) {
      showToast({ message: err?.message || 'Gagal mengirim tautan atur ulang.', tone: 'error' });
    }
  };

  const isLoading = stateOverride === 'loading' || state.status === 'loading';
  const isError = stateOverride !== 'loading' && state.status === 'error';

  return (
    <div className="admin-entity-page" ref={menuRootRef}>
      <header className="admin-list-header">
        <div className="admin-list-header__title-wrap">
          <h2 className="admin-list-header__heading">Pengguna</h2>
          <span className="admin-list-header__count" aria-label={`Total ${state.items.length} pengguna`}>
            {isLoading ? '—' : state.items.length}
          </span>
        </div>

        <button type="button" className="admin-btn admin-btn--primary" onClick={openInviteDialog}>
          + Undang pengguna
        </button>
      </header>

      {sentMessage && (
        <div className="admin-alert admin-alert--success" role="status">
          <span className="admin-alert__dot" aria-hidden="true" />
          <div className="admin-alert__body">
            <p>{sentMessage}</p>
          </div>
        </div>
      )}

      {isError && (
        <section className="admin-panel admin-panel--error" role="alert">
          <div className="admin-state-box">
            <StatusDot label="GALAT MEMUAT PENGGUNA" tone="danger" />
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
        <section className="admin-panel" aria-label="Memuat daftar pengguna">
          <div className="admin-skeleton-rows">
            {[1, 2, 3].map((idx) => (
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
            <p>Belum ada pengguna tambahan pada studio ini.</p>
            <button type="button" className="admin-btn admin-btn--primary" onClick={openInviteDialog}>
              + Undang pengguna
            </button>
          </div>
        </section>
      )}

      {!isLoading && !isError && state.items.length > 0 && (
        <>
          <section className="admin-panel admin-table-panel">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Surel</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Login terakhir</th>
                  <th className="admin-table__th-actions">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((row) => {
                  const statusBadge = mapUserStatusBadge(row.status);
                  const isSelf = isSelfUser(row);
                  const menuOpen = openMenuId === row.id;

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="admin-table__title-cell">
                          <span className="admin-list-row__title">
                            {row.name}{' '}
                            {isSelf && <span className="admin-self-tag">(Anda)</span>}
                          </span>
                        </div>
                      </td>
                      <td>{row.email}</td>
                      <td className="admin-table__cell-nowrap">
                        <span className="admin-role-badge">{row.role}</span>
                      </td>
                      <td className="admin-table__cell-nowrap">
                        <StatusDot label={statusBadge.label} tone={statusBadge.tone} />
                      </td>
                      <td className="admin-table__cell-nowrap">
                        <span className="admin-list-row__time">
                          {row.lastLoginAt ? formatRelativeTimeId(row.lastLoginAt) : 'Belum pernah'}
                        </span>
                      </td>
                      <td className="admin-table__td-actions">
                        <div className="admin-row-action-wrap">
                          <button
                            type="button"
                            className="admin-icon-btn"
                            aria-label={`Menu aksi untuk ${row.name}`}
                            aria-expanded={menuOpen}
                            aria-haspopup="menu"
                            onClick={() => setOpenMenuId(menuOpen ? null : row.id)}
                          >
                            <IconMore size={18} />
                          </button>
                          {menuOpen && (
                            <div className="admin-action-menu" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                className="admin-action-menu__item"
                                onClick={() => handleResendInvite(row)}
                              >
                                Kirim ulang undangan
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className="admin-action-menu__item"
                                onClick={() => handleResetPassword(row)}
                              >
                                Atur ulang kata sandi
                              </button>
                              <div className="admin-action-menu__divider" />
                              <button
                                type="button"
                                role="menuitem"
                                disabled={isSelf}
                                className={`admin-action-menu__item ${row.status !== 'INACTIVE' ? 'is-danger' : ''}`}
                                onClick={() => handleToggleActive(row)}
                                title={isSelf ? 'Akun Anda sendiri tidak dapat dinonaktifkan' : undefined}
                              >
                                {row.status === 'INACTIVE' ? 'Aktifkan kembali' : 'Nonaktifkan'}
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

          {/* Ponsel (<= 767px) */}
          <ul className="admin-mobile-list" aria-label="Daftar Pengguna">
            {state.items.map((row) => {
              const statusBadge = mapUserStatusBadge(row.status);
              const isSelf = isSelfUser(row);

              return (
                <li key={row.id} className="admin-mobile-row">
                  <div className="admin-mobile-row__info">
                    <span className="admin-list-row__title">
                      {row.name} {isSelf && <span className="admin-self-tag">(Anda)</span>}
                    </span>
                    <span className="admin-table__slug">{row.email}</span>
                    <div className="admin-mobile-row__badges">
                      <span className="admin-role-badge">{row.role}</span>
                      <StatusDot label={statusBadge.label} tone={statusBadge.tone} />
                      <span className="admin-list-row__time">
                        Login: {row.lastLoginAt ? formatRelativeTimeId(row.lastLoginAt) : 'Belum pernah'}
                      </span>
                    </div>
                  </div>

                  <div className="admin-mobile-row__actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={() => handleResendInvite(row)}
                    >
                      Kirim ulang
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={() => handleResetPassword(row)}
                    >
                      Atur ulang sandi
                    </button>
                    <button
                      type="button"
                      disabled={isSelf}
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      onClick={() => handleToggleActive(row)}
                    >
                      {row.status === 'INACTIVE' ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Dialog Undang Pengguna */}
      {inviteOpen && (
        <div
          className="admin-dialog-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInviteOpen(false);
          }}
        >
          <div
            className="admin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-dialog-title"
          >
            <h2 id="invite-dialog-title" className="admin-dialog__title">
              Undang pengguna baru
            </h2>
            <p className="admin-dialog__message">
              Tautan aktivasi akun akan dikirim ke alamat surel anggota tim studio.
            </p>

            <form className="admin-form" onSubmit={handleInviteSubmit} noValidate>
              <div className="admin-field">
                <label htmlFor="invite-name" className="admin-label">
                  Nama lengkap
                </label>
                <input
                  ref={inviteNameRef}
                  id="invite-name"
                  type="text"
                  className={`admin-input ${inviteErrors.name ? 'is-error' : ''}`}
                  value={inviteForm.name}
                  onChange={(e) => {
                    setInviteForm((prev) => ({ ...prev, name: e.target.value }));
                    if (inviteErrors.name) setInviteErrors((p) => ({ ...p, name: '' }));
                  }}
                  placeholder="Contoh: Kurator Studio"
                />
                {inviteErrors.name && (
                  <p className="admin-field__error" role="alert">{inviteErrors.name}</p>
                )}
              </div>

              <div className="admin-field">
                <label htmlFor="invite-email" className="admin-label">
                  Surel
                </label>
                <input
                  id="invite-email"
                  type="email"
                  className={`admin-input ${inviteErrors.email ? 'is-error' : ''}`}
                  value={inviteForm.email}
                  onChange={(e) => {
                    setInviteForm((prev) => ({ ...prev, email: e.target.value }));
                    if (inviteErrors.email) setInviteErrors((p) => ({ ...p, email: '' }));
                  }}
                  placeholder="nama@husennursidik.art"
                />
                {inviteErrors.email && (
                  <p className="admin-field__error" role="alert">{inviteErrors.email}</p>
                )}
              </div>

              <div className="admin-field">
                <label htmlFor="invite-role" className="admin-label">
                  Peran
                </label>
                <select
                  id="invite-role"
                  className="admin-select"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>

              <div className="admin-dialog__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setInviteOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={inviting}
                >
                  {inviting ? 'Mengirim...' : 'Kirim undangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminOwnerGuard sectionTitle="Pengguna">
      <UsersContent />
    </AdminOwnerGuard>
  );
}

