import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAdminAuth, useToast } from '../context/adminContexts';
import { getLockState, clearLockState, LOCAL_ACCOUNTS } from '../services/adminAuth';
import { IconEye } from '../components/AdminIcons';
import embracePainting from '../../assets/images/image 2.webp';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m} menit ${s} detik`;
  return `${s} detik`;
}

export default function AdminLogin() {
  const { isAuthenticated, login } = useAdminAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const stateParam = import.meta.env.DEV ? searchParams.get('state') : null;
  const fromPath = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(() =>
    stateParam === 'error' ? 'Surel atau kata sandi salah.' : ''
  );
  const [lockSeconds, setLockSeconds] = useState(() => {
    if (stateParam === 'locked') return 295;
    const lock = getLockState();
    return lock.isLocked ? lock.remainingSeconds : 0;
  });
  const [submitting, setSubmitting] = useState(false);

  // Hitung mundur masa kunci sementara tiap 1 detik
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  if (isAuthenticated) {
    return <Navigate to={fromPath} replace />;
  }

  const isLocked = lockSeconds > 0;

  const validate = () => {
    const errs = {};
    const trimmed = email.trim();
    if (!trimmed) {
      errs.email = 'Surel wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      errs.email = 'Format surel tidak valid.';
    }

    if (!password) {
      errs.password = 'Kata sandi wajib diisi.';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked || submitting) return;

    setFormError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (res.ok) {
      showToast({ message: `Selamat datang, ${res.user.name}.`, tone: 'success' });
      navigate(fromPath, { replace: true });
    } else if (res.code === 'LOCKED') {
      setLockSeconds(res.remainingSeconds || 300);
      setFormError('');
    } else {
      setFormError(res.message || 'Surel atau kata sandi salah.');
    }
  };

  const handleResetDemoLock = () => {
    clearLockState();
    setLockSeconds(0);
    setFormError('');
  };

  const fillAccount = import.meta.env.DEV
    ? (acc) => {
        setEmail(acc.email);
        setFieldErrors({});
        setFormError('');
      }
    : null;

  return (
    <div className="admin-auth-page">
      {/* KIRI: Panel gelap hangat dengan wordmark dan satu potongan lukisan (rapi, tanpa teks tambahan) */}
      <aside className="admin-auth-aside" aria-label="Identitas Studio">
        <div className="admin-auth-aside__brand">
          <span className="admin-brand__script admin-brand__script--light">Husen Nursidik</span>
          <span className="admin-brand__sub admin-brand__sub--light">HOUSE OF ART</span>
        </div>

        <div className="admin-auth-aside__art">
          <img
            src={embracePainting}
            alt="Potongan lukisan Dekapan Dalam Waktu karya Husen Nursidik"
            className="admin-auth-aside__img"
          />
        </div>
      </aside>

      {/* KANAN: Formulir Masuk (di ponsel hanya bagian ini yang tampil) */}
      <main className="admin-auth-main">
        <div className="admin-auth-card">
          <div className="admin-auth-mobile-brand">
            <span className="admin-brand__script">Husen Nursidik</span>
            <span className="admin-brand__sub">HOUSE OF ART</span>
          </div>

          <header className="admin-auth-card__header">
            <h1 className="admin-auth-card__title">Masuk ke Panel Studio</h1>
            <p className="admin-auth-card__subtitle">
              Kelola arsip karya, pameran, dan catatan jurnal.
            </p>
          </header>

          {/* Status Terkunci Sementara */}
          {isLocked && (
            <div className="admin-alert admin-alert--warning" role="alert">
              <span className="admin-alert__dot" aria-hidden="true" />
              <div className="admin-alert__body">
                <strong>Akses terkunci sementara</strong>
                <p>
                  Terlalu banyak percobaan masuk gagal. Silakan tunggu {formatCountdown(lockSeconds)} sebelum mencoba kembali.
                </p>
                {import.meta.env.DEV && stateParam !== 'locked' && (
                  <button
                    type="button"
                    className="admin-text-link admin-text-link--sm"
                    onClick={handleResetDemoLock}
                  >
                    Buka kunci sesi uji lokal
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Status Galat Kredensial */}
          {!isLocked && formError && (
            <div className="admin-alert admin-alert--danger" role="alert">
              <span className="admin-alert__dot" aria-hidden="true" />
              <div className="admin-alert__body">
                <span>{formError}</span>
              </div>
            </div>
          )}

          <form className="admin-form" onSubmit={handleSubmit} noValidate>
            <div className="admin-field">
              <label htmlFor="login-email" className="admin-label">
                Surel
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className={`admin-input ${fieldErrors.email ? 'is-error' : ''}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'login-email-err' : undefined}
                disabled={isLocked || submitting}
              />
              {fieldErrors.email && (
                <p id="login-email-err" className="admin-field__error" role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="admin-field">
              <label htmlFor="login-password" className="admin-label">
                Kata sandi
              </label>
              <div className="admin-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`admin-input admin-input--password ${fieldErrors.password ? 'is-error' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'login-password-err' : undefined}
                  disabled={isLocked || submitting}
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  aria-pressed={showPassword}
                  disabled={isLocked || submitting}
                >
                  <IconEye open={!showPassword} size={18} />
                </button>
              </div>
              {fieldErrors.password && (
                <p id="login-password-err" className="admin-field__error" role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div className="admin-form__meta">
              <Link to="/lupa-kata-sandi" className="admin-text-link">
                Lupa kata sandi?
              </Link>
            </div>

            <button
              type="submit"
              className="admin-btn admin-btn--primary admin-btn--full"
              disabled={isLocked || submitting}
            >
              {submitting ? 'Memeriksa...' : 'Masuk'}
            </button>
          </form>

          {/* Bantuan pengisian akun lokal pra-Supabase (HANYA di development) */}
          {import.meta.env.DEV && LOCAL_ACCOUNTS.length > 0 && (
            <details className="admin-local-hint">
              <summary className="admin-local-hint__summary">
                Akses uji lokal (pra-Supabase)
              </summary>
              <div className="admin-local-hint__body">
                {LOCAL_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    onClick={() => fillAccount?.(acc)}
                  >
                    Isi akun {acc.role} ({acc.email})
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      </main>
    </div>
  );
}

