import { createContext, useContext } from 'react';

export const AdminAuthContext = createContext(null);
export const ToastContext = createContext(null);
export const ConfirmContext = createContext(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth harus digunakan di dalam AdminAuthProvider');
  return ctx;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus digunakan di dalam ToastProvider');
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm harus digunakan di dalam ConfirmProvider');
  return ctx;
}

