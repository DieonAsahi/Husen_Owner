import { useState, useCallback, useRef, useEffect } from 'react';
import { ToastContext } from '../context/adminContexts';
import { IconClose } from './AdminIcons';

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    const t = timersRef.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(({ message, tone = 'success', duration = 4500 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);

    if (duration > 0) {
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismissToast]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="admin-toast-region" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`admin-toast admin-toast--${toast.tone}`}
          >
            <span className="admin-toast__dot" aria-hidden="true" />
            <span className="admin-toast__message">{toast.message}</span>
            <button
              type="button"
              className="admin-toast__close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
            >
              <IconClose size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

