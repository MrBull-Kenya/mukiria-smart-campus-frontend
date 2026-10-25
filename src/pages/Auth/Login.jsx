import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_HOME } from '../../config/campus';
import api from '../../services/api';
import { PasswordInput } from '../../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    api.get('/auth/passkeys/config')
      .then(({ data }) => { if (active) setPasskeyEnabled(data.enabled === true); })
      .catch((err) => {
        if (active) {
          setPasskeyEnabled(false);
          if (!err.response) console.error('Could not check passkey availability:', err);
        }
      });
    return () => { active = false; };
  }, []);

  const continueToCampus = (user) => {
    const from = location.state?.from?.pathname;
    navigate(from && from !== '/' && from !== '/login' ? from : ROLE_HOME[user.role] || '/', { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      continueToCampus(user);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    setError('');
    try {
      const user = await loginWithPasskey();
      continueToCampus(user);
    } catch (err) {
      setError(err.message || 'Could not sign in with your passkey.');
    } finally {
      setPasskeyLoading(false);
    }
  };

  const supportsPasskeys = typeof window !== 'undefined' && window.isSecureContext && 'PublicKeyCredential' in window;

  return (
    <div className="w-full space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/[0.05] sm:p-8">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-blue-800">Mukiria Smart Campus</h2>
        <p className="text-sm text-slate-500">Sign in with your institute email</p>
      </div>

      {location.state?.message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{location.state.message}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</div>}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-slate-700">Email</label>
          <input id="login-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. 12154@mtti.ac.ke"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">Password</label>
            <Link to="/auth/forgot-password" className="text-xs font-semibold text-blue-800 hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="login-password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password" className="px-4 py-3" />
        </div>

        <button type="submit" disabled={loading || passkeyLoading}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
          {loading ? 'Signing in…' : passkeyLoading ? 'Waiting for your device…' : 'Sign In'}
        </button>
      </form>

      {passkeyEnabled && supportsPasskeys && (
        <>
          <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" />
          </div>
          <button type="button" onClick={handlePasskeyLogin} disabled={loading || passkeyLoading}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" />
            </svg>
            {passkeyLoading ? 'Waiting for your device…' : 'Sign in with a passkey'}
          </button>
          <p className="-mt-3 text-center text-[11px] leading-5 text-slate-500">Use your fingerprint, face, or device screen lock.</p>
        </>
      )}

      <p className="text-center text-sm text-slate-500">
        Don't have an account? <Link to="/auth/register" className="font-bold text-blue-800 hover:underline">Register</Link>
      </p>
    </div>
  );
}
