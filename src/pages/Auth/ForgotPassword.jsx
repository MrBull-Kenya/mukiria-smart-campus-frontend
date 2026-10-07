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
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold text-gray-900">Forgot your password?</h2>
        <p className="text-xs text-gray-500">Enter your account email and we'll email you a link to choose a new one</p>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium text-center">{error}</div>}

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="text-4xl">📧</div>
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">{sent}</div>
          <p className="text-[11px] text-gray-500">Nothing after a few minutes? Check spam, make sure you used the email on your account, or ask your HOD or Administrator.</p>
          <Link to={`/auth/reset-password?email=${encodeURIComponent(email.trim())}`} className="block text-xs text-blue-600 font-bold hover:underline">I have a code instead</Link>
        </div>
      ) : (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition">
            {loading ? 'Sending…' : 'Email me a reset link'}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-gray-500"><Link to="/login" className="text-blue-600 font-bold hover:underline">Back to sign in</Link></p>
    </div>
  );
}
