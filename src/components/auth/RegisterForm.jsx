import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Input, Notice } from '../ui';

export default function RegisterForm({ title, endpoint, isRep }) {
  const navigate = useNavigate();
  const classes = useFetch('/classes/list');
  const [f, setF] = useState({ adm_no: '', name: '', email: '', parent_email: '', parent_phone: '', class_code: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (f.password.length < 8) return setError('Use at least 8 characters for your password.');
    if (f.password !== f.confirm) return setError('Passwords do not match.');
    setBusy(true); setError('');
    try {
      const { confirm, ...body } = f;
      const res = await api.post(endpoint, body);
      navigate(`/auth/verify-email?email=${encodeURIComponent(f.email)}&status=${res.data.status}&role=${isRep ? 'student_rep' : 'student'}`);
    } catch (err) { setError(getErrorMessage(err, 'Registration failed.')); }
    setBusy(false);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <form onSubmit={submit} className="space-y-3">
        <Input label="Admission number" required value={f.adm_no} onChange={set('adm_no')} />
        <Input label="Full name" required value={f.name} onChange={set('name')} />
        <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
        <label className="block">
          <span className="block text-xs font-bold text-gray-700 mb-1">Class</span>
          <select required value={f.class_code} onChange={set('class_code')} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
            <option value="">{classes.loading ? 'Loading classes…' : 'Select your class'}</option>
            {(() => {
              const raw = classes.data;
              const list = Array.isArray(raw) 
                ? raw 
                : Array.isArray(raw?.data) 
                  ? raw.data 
                  : Array.isArray(raw?.classes) 
                    ? raw.classes 
                    : [];
              return list.map((c) => (
                <option key={c.class_code} value={c.class_code}>
                  {c.class_code}{c.course ? ` · ${c.course}` : ''}
                </option>
              ));
            })()}
          </select>
          {classes.error && <span className="text-[11px] text-rose-600">{classes.error}</span>}
        </label>
        {!isRep && <Input label="Parent / guardian email (for attendance alerts)" type="email" value={f.parent_email} onChange={set('parent_email')} />}
        {!isRep && <Input label="Parent / guardian phone" value={f.parent_phone} onChange={set('parent_phone')} />}
        <Input label="Password (8+ characters)" type="password" required value={f.password} onChange={set('password')} />
        <Input label="Confirm password" type="password" required value={f.confirm} onChange={set('confirm')} />
        <button disabled={busy} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition">
          {busy ? 'Creating account…' : 'Register'}
        </button>
      </form>
      <p className="text-center text-xs text-gray-500">
        <Link to="/login" className="text-blue-600 font-bold hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}