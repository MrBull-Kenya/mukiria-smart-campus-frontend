import React, { useEffect, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../config/campus';
import { Page, Card, Input, Btn, Notice, PasswordInput, Spinner, Badge } from '../components/ui';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [passkeyEnabled, setPasskeyEnabled] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyName, setPasskeyName] = useState('My device');
  const [passkeyPassword, setPasskeyPassword] = useState('');
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/profile')
      .then(({ data }) => { if (active) setProfile(data.user); })
      .catch((err) => { if (active) setNotice({ kind: 'error', text: getErrorMessage(err, 'Could not load your profile.') }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPasskeys() {
      try {
        const [{ data: config }, { data: list }] = await Promise.all([
          api.get('/auth/passkeys/config'),
          api.get('/auth/passkeys'),
        ]);
        if (active) {
          setPasskeyEnabled(config.enabled === true);
          setPasskeys(list.passkeys || []);
        }
      } catch (err) {
        if (active) setPasskeyNotice({ kind: 'error', text: getErrorMessage(err, 'Could not load passkey settings.') });
      } finally {
        if (active) setPasskeysLoading(false);
      }
    }
    loadPasskeys();
    return () => { active = false; };
  }, []);

  const updateField = (field) => (event) => setProfile((current) => ({ ...current, [field]: event.target.value }));
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true); setNotice(null);
    try {
      const { data } = await api.put('/profile', profile);
      updateUser(data.user);
      setProfile((current) => ({ ...current, ...data.user }));
      setNotice({ kind: 'ok', text: data.message });
    } catch (err) {
      setNotice({ kind: 'error', text: getErrorMessage(err, 'Could not update your profile.') });
    } finally { setSaving(false); }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setPasswordNotice(null);
    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordNotice({ kind: 'error', text: 'The new password and confirmation do not match.' });
      return;
    }
    setPasswordSaving(true);
    try {
      const { data } = await api.post('/profile/password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswordNotice({ kind: 'ok', text: data.message });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      await logout();
      navigate('/login', { replace: true, state: { message: data.message } });
    } catch (err) {
      setPasswordNotice({ kind: 'error', text: getErrorMessage(err, 'Could not change your password.') });
    } finally { setPasswordSaving(false); }
  };

  const addPasskey = async (event) => {
    event.preventDefault();
    const name = passkeyName.trim();
    if (!name || name.length > 100) {
      setPasskeyNotice({ kind: 'error', text: 'Enter a passkey name between 1 and 100 characters.' });
      return;
    }
    setPasskeyBusy(true);
    setPasskeyNotice(null);
    try {
      const { data: challengeData } = await api.post('/auth/passkeys/registration/options', { current_password: passkeyPassword });
      const response = await startRegistration({ optionsJSON: challengeData.options });
      const { data } = await api.post('/auth/passkeys/registration/verify', {
        challenge: challengeData.options.challenge,
        response,
        name,
      });
      const { data: list } = await api.get('/auth/passkeys');
      setPasskeys(list.passkeys || []);
      setPasskeyPassword('');
      setPasskeyNotice({ kind: 'ok', text: data.message });
    } catch (err) {
      const message = err?.name === 'NotAllowedError'
        ? 'Passkey setup was cancelled or timed out. Please try again.'
        : getErrorMessage(err, 'Could not add this passkey.');
      setPasskeyNotice({ kind: 'error', text: message });
    } finally {
      setPasskeyBusy(false);
    }
  };

  const removePasskey = async (credentialId) => {
    if (!window.confirm('Remove this passkey from your account? You can still sign in with your password.')) return;
    setPasskeyBusy(true);
    setPasskeyNotice(null);
    try {
      const { data } = await api.delete(`/auth/passkeys/${encodeURIComponent(credentialId)}`);
      setPasskeys((current) => current.filter((passkey) => passkey.credential_hash !== credentialId));
      setPasskeyNotice({ kind: 'ok', text: data.message });
    } catch (err) {
      setPasskeyNotice({ kind: 'error', text: getErrorMessage(err, 'Could not remove this passkey.') });
    } finally {
      setPasskeyBusy(false);
    }
  };

  const isStudent = ['student', 'student_rep'].includes(profile?.role);
  const isStaff = ['teacher', 'hod'].includes(profile?.role);
  const supportsPasskeys = typeof window !== 'undefined' && window.isSecureContext && 'PublicKeyCredential' in window;
  const initials = (profile?.name || user.name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <Page title="My profile" subtitle={`${roleLabel(profile?.role || user.role)} account details and security`}>
      {loading ? <Spinner /> : profile && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center gap-4 border-blue-100 bg-gradient-to-r from-blue-50/80 to-white p-5">
            <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-sm shadow-blue-900/20">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-900">{profile.name}</h2>
                <Badge tone="blue">{roleLabel(profile.role)}</Badge>
              </div>
              <p className="mt-1 truncate text-sm text-slate-600">{profile.email}</p>
            </div>
            {(profile.adm_no || profile.class_code) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {profile.adm_no && <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600"><span className="font-semibold text-slate-800">Admission</span> · {profile.adm_no}</span>}
                {profile.class_code && <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600"><span className="font-semibold text-slate-800">Class</span> · {profile.class_code}</span>}
              </div>
            )}
          </Card>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="mb-5">
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">Account details</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Keep your contact information current. Admission number and class are assigned by the institute.</p>
              </div>
              <form onSubmit={saveProfile} className="space-y-4">
                <Input label="Full name" required maxLength={150} autoComplete="name" value={profile.name || ''} onChange={updateField('name')} />
                <Input label="Email address" required type="email" maxLength={254} autoComplete="email" value={profile.email || ''} onChange={updateField('email')} />
                {isStaff && <Input label="Department" maxLength={100} value={profile.department || ''} onChange={updateField('department')} />}
                {profile.role === 'teacher' && <Input label="Subject or unit" maxLength={150} value={profile.teacher_unit || ''} onChange={updateField('teacher_unit')} />}
                {isStudent && (
                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-600">Parent or guardian contact</h3>
                    <div className="space-y-4">
                      <Input label="Email address" type="email" maxLength={254} autoComplete="email" value={profile.parent_email || ''} onChange={updateField('parent_email')} />
                      <Input label="Phone number" maxLength={50} autoComplete="tel" value={profile.parent_phone || ''} onChange={updateField('parent_phone')} />
                    </div>
                  </div>
                )}
                {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
                <div className="border-t border-slate-100 pt-4">
                  <Btn type="submit" disabled={saving}>{saving ? 'Saving changes…' : 'Save profile'}</Btn>
                </div>
              </form>
            </Card>

            <Card className="p-5">
              <div className="mb-5">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" />
                  </svg>
                </div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">Password & security</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Use your current password to set a new one. You’ll be signed out after it changes.</p>
              </div>
              <form onSubmit={changePassword} className="space-y-4">
                <PasswordInput label="Current password" required autoComplete="current-password" value={passwords.current_password} onChange={(e) => setPasswords((current) => ({ ...current, current_password: e.target.value }))} />
                <PasswordInput label="New password" required minLength={8} autoComplete="new-password" value={passwords.new_password} onChange={(e) => setPasswords((current) => ({ ...current, new_password: e.target.value }))} />
                <PasswordInput label="Confirm new password" required minLength={8} autoComplete="new-password" value={passwords.confirm_password} onChange={(e) => setPasswords((current) => ({ ...current, confirm_password: e.target.value }))} />
                <p className="text-xs text-slate-500">Use at least 8 characters. Choose a password you don’t use elsewhere.</p>
                {passwordNotice && <Notice kind={passwordNotice.kind}>{passwordNotice.text}</Notice>}
                <div className="border-t border-slate-100 pt-4">
                  <Btn type="submit" disabled={passwordSaving}>{passwordSaving ? 'Updating password…' : 'Update password'}</Btn>
                </div>
              </form>
            </Card>
          </div>

          <Card className="p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">Passkey sign-in</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Sign in with your fingerprint, face, or device screen lock. Verify your password once to add a passkey. Your biometric data stays on your device; the campus stores only a public key.</p>
              </div>
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <rect x="4" y="10" width="16" height="11" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" />
                </svg>
              </span>
            </div>
            {passkeysLoading ? (
              <Spinner label="Loading passkeys…" className="p-4" />
            ) : !passkeyEnabled ? (
              <Notice kind="info">Passkey sign-in is not enabled on this server yet. You can continue signing in with your password.</Notice>
            ) : !supportsPasskeys ? (
              <Notice kind="info">This browser or connection does not support passkeys. Open the secure site in a supported browser to set one up.</Notice>
            ) : (
              <div className="space-y-4">
                {passkeys.length > 0 ? (
                  <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {passkeys.map((passkey) => (
                      <li key={passkey.credential_hash} className="flex flex-wrap items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">{passkey.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">Added {passkey.created_at ? new Date(passkey.created_at).toLocaleDateString() : 'recently'}</p>
                        </div>
                        <button type="button" onClick={() => removePasskey(passkey.credential_hash)} disabled={passkeyBusy} className="min-h-9 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No passkeys are registered on your account.</p>
                )}
                <form onSubmit={addPasskey} className="flex flex-wrap items-end gap-3">
                  <div className="w-full max-w-sm flex-1">
                    <Input label="Name this passkey" required maxLength={100} value={passkeyName} onChange={(event) => setPasskeyName(event.target.value)} placeholder="e.g. My phone" />
                  </div>
                  <div className="w-full max-w-sm flex-1">
                    <PasswordInput label="Current password (verification)" required autoComplete="current-password" value={passkeyPassword} onChange={(event) => setPasskeyPassword(event.target.value)} />
                  </div>
                  <Btn type="submit" disabled={passkeyBusy}>{passkeyBusy ? 'Waiting for your device…' : 'Add a passkey'}</Btn>
                </form>
              </div>
            )}
            {passkeyNotice && <div className="mt-4"><Notice kind={passkeyNotice.kind}>{passkeyNotice.text}</Notice></div>}
          </Card>
        </div>
      )}
      {!loading && !profile && notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
    </Page>
  );
}
