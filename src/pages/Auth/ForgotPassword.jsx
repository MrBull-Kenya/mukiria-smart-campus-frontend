import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null); // the server's (deliberately vague) confirmation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/forgot-password-email', { email: email.trim() });
      setSent(res.data.message);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send the reset email. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/[0.05] sm:p-8">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-blue-800">Forgot your password?</h2>
        <p className="text-sm text-slate-500">Enter your account email and we’ll send a link to choose a new password.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</div>}

      {sent ? (
        <div className="space-y-4 text-center">
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{sent}</div>
          <p className="text-xs leading-5 text-slate-500">Nothing after a few minutes? Check spam, make sure you used the email on your account, or ask your HOD or Administrator.</p>
          <Link to={`/auth/reset-password?email=${encodeURIComponent(email.trim())}`} className="block text-sm font-bold text-blue-800 hover:underline">I have a code instead</Link>
        </div>
      ) : (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label htmlFor="reset-request-email" className="mb-1.5 block text-xs font-bold text-slate-700">Email</label>
            <input id="reset-request-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
            {loading ? 'Sending…' : 'Email me a reset link'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-500"><Link to="/login" className="font-bold text-blue-800 hover:underline">Back to sign in</Link></p>
    </div>
  );
}
