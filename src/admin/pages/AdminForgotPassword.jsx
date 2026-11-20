import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAdminAuth, useToast } from '../context/adminContexts';
import { requestPasswordReset } from '../services/adminAuth';
import embracePainting from '../../assets/images/image 2.webp';

export default function AdminForgotPassword() {
  const { isAuthenticated } = useAdminAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const stateParam = import.meta.env.DEV ? searchParams.get('state') : null;

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [serverError, setServerError] = useState(() =>
    stateParam === 'error'
      ? 'Permintaan tidak dapat diproses saat ini. Periksa koneksi Anda dan coba kembali.'
      : ''
  );
  const [successMessage, setSuccessMessage] = useState(() =>
    stateParam === 'success'
      ? 'Jika surel tersebut terdaftar dalam sistem studio, tautan untuk mengatur ulang kata sandi telah dikirimkan. Silakan periksa kotak masuk Anda.'
      : ''
  );
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setServerError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('Surel wajib diisi.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError('Format surel tidak valid.');
      return;
    }

    setFieldError('');
    setSubmitting(true);
    const res = await requestPasswordReset(trimmed, {
      simulateError: stateParam === 'error',
    });
    setSubmitting(false);

    if (res.ok) {
      setSuccessMessage(res.message);
      showToast({ message: 'Permintaan pengaturan ulang kata sandi diproses.', tone: 'success' });
    } else {
      setServerError(res.message);
    }
  };

  return (
    <div className="admin-auth-page">
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

      <main className="admin-auth-main">
        <div className="admin-auth-card">
          <div className="admin-auth-mobile-brand">
            <span className="admin-brand__script">Husen Nursidik</span>
            <span className="admin-brand__sub">HOUSE OF ART</span>
          </div>

          <header className="admin-auth-card__header">
            <h1 className="admin-auth-card__title">Atur Ulang Kata Sandi</h1>
            <p className="admin-auth-card__subtitle">
              Masukkan surel akun studio Anda untuk menerima tautan pemulihan.
            </p>
          </header>

          {serverError && (
            <div className="admin-alert admin-alert--danger" role="alert">
              <span className="admin-alert__dot" aria-hidden="true" />
              <div className="admin-alert__body">
                <span>{serverError}</span>
              </div>
            </div>
          )}

          {successMessage ? (
            <div className="admin-alert admin-alert--success" role="status">
              <span className="admin-alert__dot" aria-hidden="true" />
              <div className="admin-alert__body">
                <p>{successMessage}</p>
              </div>
            </div>
          ) : (
            <form className="admin-form" onSubmit={handleSubmit} noValidate>
              <div className="admin-field">
                <label htmlFor="reset-email" className="admin-label">
                  Surel
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  className={`admin-input ${fieldError ? 'is-error' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError('');
                  }}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? 'reset-email-err' : undefined}
                  disabled={submitting}
                />
                {fieldError && (
                  <p id="reset-email-err" className="admin-field__error" role="alert">
                    {fieldError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="admin-btn admin-btn--primary admin-btn--full"
                disabled={submitting}
              >
                {submitting ? 'Mengirim...' : 'Kirim tautan atur ulang'}
              </button>
            </form>
          )}

          <div className="admin-auth-card__footer">
            <Link to="/login" className="admin-text-link">
              ← Kembali ke halaman masuk
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

