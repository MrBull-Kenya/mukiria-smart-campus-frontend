import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { STORAGE_KEYS } from '../config/campus';
import { getDeviceId } from '../services/deviceFingerprint';
import { closeSocket } from '../services/socket';

export const AuthContext = createContext(null);

function tokenExpired(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return exp ? exp * 1000 < Date.now() : false;
  } catch {
    return true; // malformed token
  }
}

function readSession() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
    if (token && user && !tokenExpired(token)) return { token, user };
  } catch { /* fall through */ }
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    closeSocket();
    setSession({ token: null, user: null });
  }, []);

  // POST /auth/login expects { email, password, device_id } (authController.login)
  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email: email.trim(), password, device_id: getDeviceId() });
    const { token, user } = res.data;
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    setSession({ token, user });
    return user;
  }, []);

  // api.js fires this when the server rejects the token; also keeps multiple tabs in sync.
  useEffect(() => {
    const onUnauthorized = () => logout();
    const onStorage = (e) => { if (e.key === STORAGE_KEYS.token && !e.newValue) logout(); };
    window.addEventListener('mtt:unauthorized', onUnauthorized);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('mtt:unauthorized', onUnauthorized);
      window.removeEventListener('storage', onStorage);
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      user: session.user,
      token: session.token,
      deviceId: getDeviceId(),
      isAuthenticated: !!session.token && !!session.user,
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
