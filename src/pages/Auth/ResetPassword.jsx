import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';

// The reset email contains a token only (no link), so the student enters email + token + new password.
// POST /auth/reset-password/:token  { email, token, newPassword }  (authController.resetPassword)
export default function ResetPassword() {
  const [params] = useSearchParams();
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
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    setError('');
    try {
      const t = token.trim();
      await api.post(`/auth/reset-password/${encodeURIComponent(t)}`, { email: email.trim(), token: t, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid or expired reset token.'));
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500';

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold text-gray-900">Set New Password</h2>
        <p className="text-xs text-gray-500">Enter the token from your email and choose a new password</p>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium text-center">{error}</div>}
      {success ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium text-center">
          Password updated. Redirecting to sign in…
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={input} />
          <input type="text" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="Reset token from email" className={`${input} font-mono`} />
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className={input} />
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className={input} />
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
      <p className="text-center text-xs text-gray-500"><Link to="/login" className="text-blue-600 font-bold hover:underline">Back to sign in</Link></p>
    </div>
  );
}
