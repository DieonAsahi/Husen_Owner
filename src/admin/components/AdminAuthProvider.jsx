import { useState, useCallback } from 'react';
import { AdminAuthContext } from '../context/adminContexts';
import {
  getStoredSession,
  loginAdmin,
  logoutAdmin,
} from '../services/adminAuth';
import { touchUserLoginRecord } from '../services/adminStudioStore';

export default function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredSession());

  const login = useCallback(async (email, password) => {
    const res = await loginAdmin(email, password);
    if (res.ok) {
      touchUserLoginRecord(res.user);
      setUser(res.user);
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    logoutAdmin();
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ user, login, logout, isAuthenticated: Boolean(user) }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

