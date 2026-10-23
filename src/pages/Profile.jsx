import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../config/campus';
import { Page, Card, Input, Btn, Notice, PasswordInput, Spinner } from '../components/ui';

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

  useEffect(() => {
    let active = true;
    api.get('/profile')
      .then(({ data }) => { if (active) setProfile(data.user); })
      .catch((err) => { if (active) setNotice({ kind: 'error', text: getErrorMessage(err, 'Could not load your profile.') }); })
      .finally(() => { if (active) setLoading(false); });
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

  const isStudent = ['student', 'student_rep'].includes(profile?.role);
  const isStaff = ['teacher', 'hod'].includes(profile?.role);

  return (
    <Page title="My profile" subtitle={`${roleLabel(profile?.role || user.role)} account details and security`}>
      {loading ? <Spinner /> : profile && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 text-sm font-black text-gray-900">Account details</h2>
            <form onSubmit={saveProfile} className="space-y-3">
              <Input label="Full name" required maxLength={150} value={profile.name || ''} onChange={updateField('name')} />
              <Input label="Email address" required type="email" maxLength={254} value={profile.email || ''} onChange={updateField('email')} />
              {profile.adm_no && <Input label="Admission number" value={profile.adm_no} readOnly />}
              {profile.class_code && <Input label="Class" value={profile.class_code} readOnly />}
              {isStaff && <Input label="Department" maxLength={100} value={profile.department || ''} onChange={updateField('department')} />}
              {profile.role === 'teacher' && <Input label="Subject or unit" maxLength={150} value={profile.teacher_unit || ''} onChange={updateField('teacher_unit')} />}
              {isStudent && <>
                <Input label="Parent or guardian email" type="email" maxLength={254} value={profile.parent_email || ''} onChange={updateField('parent_email')} />
                <Input label="Parent or guardian phone" maxLength={50} value={profile.parent_phone || ''} onChange={updateField('parent_phone')} />
              </>}
              {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
              <Btn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Btn>
            </form>
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-black text-gray-900">Change password</h2>
            <p className="mb-4 text-xs text-gray-500">After a successful change, you will be signed out and asked to log in again.</p>
            <form onSubmit={changePassword} className="space-y-3">
              <PasswordInput label="Current password" required autoComplete="current-password" value={passwords.current_password} onChange={(e) => setPasswords((current) => ({ ...current, current_password: e.target.value }))} />
              <PasswordInput label="New password (at least 8 characters)" required minLength={8} autoComplete="new-password" value={passwords.new_password} onChange={(e) => setPasswords((current) => ({ ...current, new_password: e.target.value }))} />
              <PasswordInput label="Confirm new password" required minLength={8} autoComplete="new-password" value={passwords.confirm_password} onChange={(e) => setPasswords((current) => ({ ...current, confirm_password: e.target.value }))} />
              {passwordNotice && <Notice kind={passwordNotice.kind}>{passwordNotice.text}</Notice>}
              <Btn type="submit" disabled={passwordSaving}>{passwordSaving ? 'Changing…' : 'Change password'}</Btn>
            </form>
          </Card>
        </div>
      )}
      {!loading && !profile && notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
    </Page>
  );
}
