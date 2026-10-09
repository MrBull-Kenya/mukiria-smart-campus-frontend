import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../config/campus';
import api from '../services/api';
import { getDeviceId } from '../services/deviceFingerprint';

export const AuthContext = createContext(null);

function readCached() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
    if (token && user) return { token, user };
  } catch (err) {
    console.warn('Could not restore the saved sign-in:', err);
  }
  return { token: null, user: null };
}
function cache(token, user) {
  if (token && user) {
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readCached);

  const logout = useCallback(async () => {
    cache(null, null);
    setSession({ token: null, user: null });
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password,
        device_id: getDeviceId(),
      });
      cache(data.token, data.user);
      setSession({ token: data.token, user: data.user });
      return data.user;
    } catch (err) {
      throw new Error(apiErrorMessage(err, 'Could not sign in.'));
    }
  }, []);

  // The backend owns the session and clears cached credentials when a JWT expires or is revoked.
  useEffect(() => {
    const handleUnauthorized = () => {
      cache(null, null);
      setSession({ token: null, user: null });
    };
    window.addEventListener('mtt:unauthorized', handleUnauthorized);

    if (session.token) {
      api.get('/auth/verify-token').catch((err) => {
        if (!err.response || err.response.status !== 401 && err.response.status !== 403) {
          console.error('Could not verify the saved sign-in:', err);
        }
      });
    }

    return () => window.removeEventListener('mtt:unauthorized', handleUnauthorized);
  }, [session.token]);

  const value = useMemo(() => ({
    user: session.user,
    token: session.token,
    deviceId: getDeviceId(),
    isAuthenticated: !!session.token && !!session.user,
    login,
    logout,
  }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error || err?.response?.data?.message ||
    (err?.isNetworkError ? 'Cannot reach the sign-in server. Check your connection.' : fallback);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
