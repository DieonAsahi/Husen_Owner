import { useState } from 'react';
import { IconLock } from './AdminIcons';

/**
 * Kolom Slug dengan kunci pengaman untuk konten yang sudah terbit.
 * Menampilkan peringatan oker jika pengguna membuka kunci slug terbit.
 */
export default function AdminSlugField({
  id = 'entity-slug',
  value,
  isPublishedInitially = false,
  basePrefix = '/karya/',
  error = '',
  onChange,
}) {
  const [unlocked, setUnlocked] = useState(!isPublishedInitially);

  const isLocked = isPublishedInitially && !unlocked;

  return (
    <div className="admin-field">
      <label htmlFor={id} className="admin-label">
        Slug URL
      </label>

      <div className="admin-slug-wrap">
        <span className="admin-slug-prefix" aria-hidden="true">
          {basePrefix}
        </span>
        <input
          id={id}
          type="text"
          className={`admin-input admin-input--slug ${error ? 'is-error' : ''}`}
          value={value}
          readOnly={isLocked}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [
              error ? `${id}-err` : '',
              isPublishedInitially ? `${id}-hint` : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
        {isPublishedInitially && (
          <button
            type="button"
            className="admin-slug-lock-btn"
            onClick={() => setUnlocked((prev) => !prev)}
            aria-label={isLocked ? 'Buka kunci slug' : 'Kunci slug kembali'}
            aria-pressed={unlocked}
            title={isLocked ? 'Buka kunci slug' : 'Kunci slug'}
          >
            <IconLock locked={isLocked} size={16} />
          </button>
        )}
      </div>

      {isPublishedInitially && isLocked && (
        <p id={`${id}-hint`} className="admin-field__help">
          Terkunci otomatis karena sudah terbit. Klik ikon gembok untuk mengubah.
        </p>
      )}

      {isPublishedInitially && unlocked && (
        <p id={`${id}-hint`} className="admin-field__warning" role="status">
          <span className="admin-status__dot admin-dot--warning" aria-hidden="true" />
          Peringatan: Tautan lama akan putus bila slug yang sudah terbit diubah.
        </p>
      )}

      {error && (
        <p id={`${id}-err`} className="admin-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

