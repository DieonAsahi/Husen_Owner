/**
 * Layanan Autentikasi Lokal Panel Admin (Pra-Supabase)
 * Siap digantikan dengan supabase.auth.signInWithPassword / resetPasswordForEmail.
 */

const SESSION_KEY = 'hn_admin_session';
const LOCK_KEY = 'hn_admin_lock';
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;

export const LOCAL_ACCOUNTS = import.meta.env.DEV
  ? (await import('../../dev-seed/index.js')).LOCAL_ACCOUNTS
  : [];

function safeReadStorage(key) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeWriteStorage(key, val) {
  try {
    if (val === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Abaikan bila sessionStorage dinonaktifkan
  }
}

export function getStoredSession() {
  if (!import.meta.env.DEV) {
    return null;
  }
  const data = safeReadStorage(SESSION_KEY);
  if (data && data.email && (data.role === 'ADMIN' || data.role === 'OWNER')) {
    return data;
  }
  return null;
}

export function getLockState() {
  const state = safeReadStorage(LOCK_KEY);
  if (!state) return { attempts: 0, lockedUntil: 0, isLocked: false, remainingSeconds: 0 };

  const now = Date.now();
  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      attempts: state.attempts || MAX_ATTEMPTS,
      lockedUntil: state.lockedUntil,
      isLocked: true,
      remainingSeconds: Math.ceil((state.lockedUntil - now) / 1000),
    };
  }

  if (state.lockedUntil && state.lockedUntil <= now) {
    safeWriteStorage(LOCK_KEY, null);
    return { attempts: 0, lockedUntil: 0, isLocked: false, remainingSeconds: 0 };
  }

  return {
    attempts: state.attempts || 0,
    lockedUntil: 0,
    isLocked: false,
    remainingSeconds: 0,
  };
}

export function clearLockState() {
  safeWriteStorage(LOCK_KEY, null);
}

export async function loginAdmin(email, password) {
  await new Promise((resolve) => window.setTimeout(resolve, 300));

  if (!import.meta.env.DEV) {
    return {
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Autentikasi produksi memerlukan koneksi Supabase Auth yang aktif.',
    };
  }

  const lock = getLockState();
  if (lock.isLocked) {
    return {
      ok: false,
      code: 'LOCKED',
      remainingSeconds: lock.remainingSeconds,
    };
  }

  const normalized = String(email || '').trim().toLowerCase();
  const matched = LOCAL_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === normalized && String(password || '').length > 0
  );

  // Periksa status aktif akun jika daftar pengguna telah diinisialisasi
  const storedUsers = safeReadStorage('hn_admin_users_store_v1');
  if (matched && Array.isArray(storedUsers)) {
    const userRow = storedUsers.find((u) => u.email.toLowerCase() === normalized);
    if (userRow && userRow.status === 'INACTIVE') {
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: MAX_ATTEMPTS - (lock.attempts || 0),
      };
    }
  }

  if (!matched) {
    const nextAttempts = (lock.attempts || 0) + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCK_DURATION_MS;
      safeWriteStorage(LOCK_KEY, { attempts: nextAttempts, lockedUntil });
      return {
        ok: false,
        code: 'LOCKED',
        remainingSeconds: Math.ceil(LOCK_DURATION_MS / 1000),
      };
    }
    safeWriteStorage(LOCK_KEY, { attempts: nextAttempts, lockedUntil: 0 });
    return {
      ok: false,
      code: 'INVALID_CREDENTIALS',
      remainingAttempts: MAX_ATTEMPTS - nextAttempts,
    };
  }

  clearLockState();
  const user = {
    id: matched.id,
    email: matched.email,
    name: matched.name,
    role: matched.role,
  };
  safeWriteStorage(SESSION_KEY, user);
  return { ok: true, user };
}

export function logoutAdmin() {
  safeWriteStorage(SESSION_KEY, null);
}

export async function requestPasswordReset(email, { simulateError = false } = {}) {
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  if (simulateError || String(email).toLowerCase().includes('error@')) {
    return {
      ok: false,
      message: 'Permintaan tidak dapat diproses saat ini. Periksa koneksi Anda dan coba kembali.',
    };
  }
  return {
    ok: true,
    message:
      'Jika surel tersebut terdaftar dalam sistem studio, tautan untuk mengatur ulang kata sandi telah dikirimkan. Silakan periksa kotak masuk Anda.',
  };
}

