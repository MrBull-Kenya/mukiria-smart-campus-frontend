import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { Input, Notice } from '../ui';

// Shared by the Teacher, HOD and Administrator registration pages.
// Staff accounts wait for Administrator approval (the very first Administrator is approved automatically).
export default function RegisterStaff({ role, title, intro }) {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.password.length < 8) return setError('Use at least 8 characters for your password.');
    if (f.password !== f.confirm) return setError('Passwords do not match.');
    setBusy(true); setError('');
    try {
      const res = await api.post(`/auth/register-${role}`, { name: f.name, email: f.email, password: f.password });
      navigate(`/auth/verify-email?email=${encodeURIComponent(f.email)}&status=${res.data.status}&role=${role}`);
    } catch (err) { setError(getErrorMessage(err, 'Registration failed.')); }
    setBusy(false);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full space-y-4">
      <div className="text-center space-y-1"><h2 className="text-2xl font-extrabold text-gray-900">{title}</h2><p className="text-xs text-gray-500">{intro}</p></div>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-3">
        <Input label="Full name" required value={f.name} onChange={set('name')} placeholder={role === 'teacher' ? 'Exactly as class reps will pick it, e.g. Mr. Otieno' : ''} />
        <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
        <Input label="Password (8+ characters)" type="password" required value={f.password} onChange={set('password')} />
        <Input label="Confirm password" type="password" required value={f.confirm} onChange={set('confirm')} />
        <button disabled={busy} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition">{busy ? 'Creating account…' : 'Register'}</button>
      </form>
      <p className="text-center text-xs text-gray-500"><Link to="/auth/register" className="text-blue-600 font-bold hover:underline">Choose a different role</Link> · <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link></p>
    </div>
  );
}
