import { useState, useCallback, useRef, useEffect } from 'react';
import { ConfirmContext } from '../context/adminContexts';

export default function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const openerRef = useRef(null);

  const closeWith = useCallback((result) => {
    const res = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    if (res) res(result);

    if (openerRef.current && typeof openerRef.current.focus === 'function') {
      const target = openerRef.current;
      openerRef.current = null;
      window.requestAnimationFrame(() => target.focus());
    }
  }, []);

  const confirm = useCallback(({
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmLabel = 'Ya, Lanjutkan',
    cancelLabel = 'Batal',
    destructive = true,
  }) => {
    openerRef.current = document.activeElement;
    setDialog({ title, message, confirmLabel, cancelLabel, destructive });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;

    const raf = window.requestAnimationFrame(() => {
      cancelBtnRef.current?.focus();
    });

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeWith(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog, closeWith]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className="admin-dialog-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeWith(false);
          }}
        >
          <div
            className="admin-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-title"
            aria-describedby="admin-confirm-desc"
          >
            <h2 id="admin-confirm-title" className="admin-dialog__title">
              {dialog.title}
            </h2>
            <p id="admin-confirm-desc" className="admin-dialog__message">
              {dialog.message}
            </p>
            <div className="admin-dialog__actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => closeWith(false)}
              >
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                className={`admin-btn ${dialog.destructive ? 'admin-btn--destructive' : 'admin-btn--primary'}`}
                onClick={() => closeWith(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

