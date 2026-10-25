import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { PasswordInput } from '../../components/ui';

// Arrives from the emailed link (/auth/reset-password?email=...&token=...): then only the new password is asked for.
// Without those parameters (typed code) the email and code boxes are shown too.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const fromLink = !!(params.get('email') && params.get('token'));
  const [email, setEmail] = useState(params.get('email') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const t = token.trim();
      await api.post(`/auth/reset-password/${encodeURIComponent(t)}`, { email: email.trim(), token: t, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(getErrorMessage(err, 'This reset link is invalid or has expired.'));
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

  return (
    <div className="w-full space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/[0.05] sm:p-8">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-blue-800">Choose a new password</h2>
        <p className="text-sm text-slate-500">
          {fromLink ? <>for <strong>{email}</strong></> : 'Enter your email, the code from the email we sent, and a new password'}
        </p>
      </div>

      {error && (
        <div role="alert" className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
          <p>{error}</p>
          <Link to="/auth/forgot-password" className="underline font-bold">Request a new link</Link>
        </div>
      )}
      {success ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          Password updated. Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-3">
          {!fromLink && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} /></label>}
          {!fromLink && <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-700">Reset code</span><input type="text" autoComplete="one-time-code" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Code from the email" className={`${input} font-mono`} /></label>}
          <PasswordInput label="New password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="px-4 py-3" />
          <PasswordInput label="Confirm new password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your new password" className="px-4 py-3" />
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
      <p className="text-center text-sm text-slate-500"><Link to="/login" className="font-bold text-blue-800 hover:underline">Back to sign in</Link></p>
    </div>
  );
}
