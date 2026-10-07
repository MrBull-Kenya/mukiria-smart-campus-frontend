import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../config/campus';
import { supabase, friendlyError } from '../utils/supabase';

export const AuthContext = createContext(null);

const PROFILE_COLS = 'id,email,name,role,status,adm_no,class_code,parent_email,parent_phone';
const STATUS_TEXT = {
  pending: 'Your account is waiting for approval. You will be able to sign in once it is approved.',
  rejected: 'Your registration was rejected. Please contact the institute.',
  deactivated: 'This account has been deactivated. Please contact the institute.',
};

function readCached() {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.token);
    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
    if (token && user) return { token, user };
  } catch { /* ignore */ }
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

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readCached);

  const logout = useCallback(async () => {
    cache(null, null);
    setSession({ token: null, user: null });
    try { await supabase.auth.signOut(); } catch { /* already signed out */ }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const profile = await fetchProfile(data.user.id);
      if (!profile) throw new Error('No profile found for this account. Ask an Administrator to check your registration.');
      if (profile.status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error(STATUS_TEXT[profile.status] || 'This account cannot sign in yet.');
      }
      cache(data.session.access_token, profile);
      setSession({ token: data.session.access_token, user: profile });
      return profile;
    } catch (err) {
      throw new Error(friendlyError(err, 'Could not sign in.'));
    }
  }, []);

  // Keep the cached token fresh and react to sign-out from another tab.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') { cache(null, null); setSession({ token: null, user: null }); }
      else if (event === 'TOKEN_REFRESHED' && s) {
        setSession((cur) => { if (cur.user) cache(s.access_token, cur.user); return cur.user ? { ...cur, token: s.access_token } : cur; });
      }
    });
    // If the cached session no longer exists in Supabase (e.g. expired), drop it.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { cache(null, null); setSession({ token: null, user: null }); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user: session.user,
    token: session.token,
    deviceId: null,
    isAuthenticated: !!session.token && !!session.user,
    login,
    logout,
  }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
