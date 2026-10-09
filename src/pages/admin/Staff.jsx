import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn, Card, Input, Notice, statusTone } from '../../components/ui';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generatePassword = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => ALPHABET[b % ALPHABET.length]).join('');
const ROLE_LABEL = { teacher: 'Teacher', hod: 'HOD', admin: 'Administrator' };

export default function AdminStaff() {
  const state = useFetch('/admin/staff');
  const [f, setF] = useState({ role: 'teacher', name: '', email: '', password: '' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const run = async (fn) => { setMsg(null); try { const res = await fn(); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); return true; } catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); return false; } };

  const add = async (e) => { e.preventDefault(); if (await run(() => api.post('/admin/staff', f))) setF({ role: 'teacher', name: '', email: '', password: '' }); };
  const decide = (id, decision) => run(() => api.post(`/admin/staff/${id}/decision`, { decision }));
  const setStatus = (id, status) => run(() => api.post(`/admin/staff/${id}/status`, { status }));
  const resetPassword = (u) => {
    const password = window.prompt(`New password for ${u.name} (8+ characters):`, generatePassword());
    if (password) run(() => api.post(`/admin/staff/${u.id}/password`, { password }));
  };

  return (
    <Page title="Staff accounts" subtitle="Teachers, HODs and Administrators">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <Async state={state}>
        {(rows) => {
          const pending = rows.filter((r) => r.status === 'pending');
          return (
            <>
              {pending.length > 0 && (
                <>
                  <h2 className="text-sm font-bold text-gray-700">Waiting for approval ({pending.length})</h2>
                  <Table rows={pending} columns={[
                    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: (r) => ROLE_LABEL[r.role] },
                    { key: 'a', label: '', render: (r) => <div className="flex gap-2"><Btn variant="ok" onClick={() => decide(r.id, 'approve')}>Approve</Btn><Btn variant="ghost" onClick={() => decide(r.id, 'reject')}>Reject</Btn></div> },
                  ]} />
                </>
              )}

              <Card className="max-w-xl">
                <form onSubmit={add} className="space-y-3">
                  <p className="text-sm font-bold text-gray-800">Add a staff member (active immediately)</p>
                  <label className="block"><span className="block text-xs font-bold text-gray-700 mb-1">Role</span>
                    <select value={f.role} onChange={set('role')} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                      <option value="teacher">Teacher</option><option value="hod">Head of Department (HOD)</option><option value="admin">Administrator</option>
                    </select></label>
                  <Input label="Full name" required value={f.name} onChange={set('name')} placeholder={f.role === 'teacher' ? "Exactly as class reps will pick it, e.g. Mr. Otieno" : ''} />
                  <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
                  <div className="flex gap-2 items-end">
                    <div className="flex-1"><Input label="Password (8+ characters)" type="password" required autoComplete="new-password" value={f.password} onChange={set('password')} /></div>
                    <Btn type="button" variant="ghost" onClick={() => setF((x) => ({ ...x, password: generatePassword() }))}>Generate</Btn>
                  </div>
                  <Btn type="submit">+ Add staff member</Btn>
                </form>
              </Card>

              <h2 className="text-sm font-bold text-gray-700">All staff</h2>
              <Table rows={rows} empty="No staff accounts yet." columns={[
                { key: 'name', label: 'Name', render: (r) => <>{r.name}{r.isMe && <span className="ml-1 text-[10px] text-blue-600 font-bold">YOU</span>}</> },
                { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: (r) => ROLE_LABEL[r.role] },
                { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status === 'inactive' ? 'rejected' : r.status)}>{r.status}</Badge> },
                { key: 'a', label: '', render: (r) => r.isMe || r.status === 'pending' ? null : (
                  <div className="flex gap-3 text-[11px] font-bold">
                    {r.status === 'active'
                      ? <button onClick={() => setStatus(r.id, 'inactive')} className="text-rose-600 underline">Deactivate</button>
                      : <button onClick={() => setStatus(r.id, 'active')} className="text-emerald-600 underline">Activate</button>}
                    <button onClick={() => resetPassword(r)} className="text-gray-500 underline">Set password</button>
                  </div>) },
              ]} />
            </>
          );
        }}
      </Async>
    </Page>
  );
}
