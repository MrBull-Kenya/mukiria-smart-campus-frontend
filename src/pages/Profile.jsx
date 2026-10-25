import React, { useEffect, useRef, useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getProfilePhotoUrl, roleLabel } from '../config/campus';
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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNotice, setPhotoNotice] = useState(null);
  const [photoDraft, setPhotoDraft] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(288);
  const [cropImageSize, setCropImageSize] = useState(null);
  const [cropError, setCropError] = useState('');
  const photoInputRef = useRef(null);
  const cropViewportRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => () => {
    if (photoDraft?.url) URL.revokeObjectURL(photoDraft.url);
  }, [photoDraft]);

  useEffect(() => {
    if (!photoDraft) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !photoBusy) setPhotoDraft(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [photoDraft, photoBusy]);

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

  const selectPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoNotice(null);
    setCropError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setPhotoNotice({ kind: 'error', text: 'Choose a JPEG, PNG, WebP, or GIF image.' });
    } else if (file.size > 2 * 1024 * 1024) {
      setPhotoNotice({ kind: 'error', text: 'Choose an image that is 2 MB or smaller.' });
    } else {
      setPhotoDraft({ file, url: URL.createObjectURL(file) });
      setCropZoom(1);
      setCropImageSize(null);
    }
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const setCropImage = (image) => {
    const size = cropViewportRef.current?.clientWidth || 288;
    const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const baseWidth = image.naturalWidth * scale;
    const baseHeight = image.naturalHeight * scale;
    const width = baseWidth * cropZoom;
    const height = baseHeight * cropZoom;
    setCropSize(size);
    setCropImageSize({ baseWidth, baseHeight, width, height, scale: scale * cropZoom });
    setCropOffset({ x: (size - width) / 2, y: (size - height) / 2 });
  };

  const updateCropZoom = (value) => {
    const zoom = Number(value);
    setCropZoom(zoom);
    if (!cropImageSize) return;
    const width = cropImageSize.baseWidth * zoom;
    const height = cropImageSize.baseHeight * zoom;
    const baseScale = cropImageSize.scale / (cropZoom || 1);
    setCropImageSize({ ...cropImageSize, width, height, scale: baseScale * zoom });
    setCropOffset({ x: (cropSize - width) / 2, y: (cropSize - height) / 2 });
  };

  const startCropDrag = (event) => {
    if (!cropImageSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset: cropOffset,
    };
  };

  const moveCrop = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !cropImageSize) return;
    setCropOffset({
      x: Math.min(0, Math.max(cropSize - cropImageSize.width, drag.offset.x + event.clientX - drag.startX)),
      y: Math.min(0, Math.max(cropSize - cropImageSize.height, drag.offset.y + event.clientY - drag.startY)),
    });
  };

  const saveCroppedPhoto = async () => {
    if (!photoDraft || !cropImageSize) return;
    setPhotoBusy(true);
    setPhotoNotice(null);
    setCropError('');
    try {
      const image = new Image();
      image.src = photoDraft.url;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image editing is not available in this browser.');
      const sourceX = Math.max(0, -cropOffset.x / cropImageSize.scale);
      const sourceY = Math.max(0, -cropOffset.y / cropImageSize.scale);
      const sourceSize = cropSize / cropImageSize.scale;
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Could not prepare the cropped image. Please try another photo.');

      const formData = new FormData();
      formData.append('photo', blob, 'profile-photo.jpg');
      const { data } = await api.post('/profile/photo', formData);
      setProfile((current) => ({ ...current, profile_photo_url: data.user.profile_photo_url }));
      updateUser({ profile_photo_url: data.user.profile_photo_url });
      setPhotoNotice({ kind: 'ok', text: data.message });
      setPhotoDraft(null);
    } catch (err) {
      setCropError(err?.message || getErrorMessage(err, 'Could not update your profile photo.'));
    } finally {
      setPhotoBusy(false);
    }
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
            <div className="relative">
              {profile.profile_photo_url ? (
                <img src={getProfilePhotoUrl(profile.profile_photo_url)} alt="Profile" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl object-cover shadow-sm shadow-blue-900/20" />
              ) : (
                <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-sm shadow-blue-900/20">
                  {initials}
                </div>
              )}
              {isStudent && (
                <>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoBusy}
                    className="absolute -bottom-1 -right-1 flex h-8 items-center gap-1 rounded-full border-2 border-white bg-blue-700 px-2.5 text-[10px] font-bold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m13.8 3.2 3 3M3 17l3.8-.8L16.5 6.5a2.1 2.1 0 0 0-3-3L3.8 13.2 3 17Z" />
                    </svg>
                    Edit
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={selectPhoto} />
                </>
              )}
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
          {photoNotice && <Notice kind={photoNotice.kind}>{photoNotice.text}</Notice>}

          {photoDraft && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm" onMouseDown={(event) => {
              if (event.target === event.currentTarget && !photoBusy) setPhotoDraft(null);
            }}>
              <section role="dialog" aria-modal="true" aria-labelledby="photo-crop-title" className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 id="photo-crop-title" className="text-lg font-extrabold tracking-tight text-slate-900">Preview and crop photo</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Drag to position your photo, then adjust the zoom. The square preview is how it will appear on your profile.</p>
                  </div>
                  <button type="button" onClick={() => setPhotoDraft(null)} disabled={photoBusy} aria-label="Close photo editor" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50">
                    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" d="m5 5 10 10M15 5 5 15" /></svg>
                  </button>
                </div>
                <div className="flex justify-center">
                  <div
                    ref={cropViewportRef}
                    onPointerDown={startCropDrag}
                    onPointerMove={moveCrop}
                    onPointerUp={() => { dragRef.current = null; }}
                    onPointerCancel={() => { dragRef.current = null; }}
                    className="relative size-72 max-h-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] touch-none cursor-grab overflow-hidden rounded-2xl bg-slate-100 ring-4 ring-blue-50 active:cursor-grabbing"
                    aria-label="Drag the image to adjust the crop"
                  >
                    <img
                      src={photoDraft.url}
                      alt="Photo crop preview"
                      onLoad={(event) => setCropImage(event.currentTarget)}
                      draggable="false"
                      className="pointer-events-none absolute max-w-none select-none"
                      style={cropImageSize ? {
                        width: cropImageSize.width,
                        height: cropImageSize.height,
                        left: cropOffset.x,
                        top: cropOffset.y,
                      } : { visibility: 'hidden' }}
                    />
                    {!cropImageSize && <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-500">Preparing preview…</span>}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/70" />
                  </div>
                </div>
                <label className="mt-5 block">
                  <span className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700"><span>Zoom</span><span>{Math.round(cropZoom * 100)}%</span></span>
                  <input type="range" min="1" max="3" step="0.01" value={cropZoom} onChange={(event) => updateCropZoom(event.target.value)} disabled={!cropImageSize || photoBusy} className="h-2 w-full cursor-pointer accent-blue-700" />
                </label>
                {cropError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium leading-5 text-rose-800">{cropError}</div>}
                <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setPhotoDraft(null)} disabled={photoBusy} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button type="button" onClick={saveCroppedPhoto} disabled={photoBusy || !cropImageSize} className="min-h-10 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {photoBusy ? 'Saving photo…' : 'Save profile photo'}
                  </button>
                </div>
              </section>
            </div>
          )}

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
