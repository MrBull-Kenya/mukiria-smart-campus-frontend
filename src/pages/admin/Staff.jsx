import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn, Card, Input, Notice, statusTone } from '../../components/ui';
import { DEPARTMENTS } from '../../constants/departments';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generatePassword = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => ALPHABET[b % ALPHABET.length]).join('');
const ROLE_LABEL = { teacher: 'Teacher', hod: 'HOD', admin: 'Administrator' };

export default function AdminStaff() {
  const state = useFetch('/admin/staff');
  const classesState = useFetch('/admin/classes');
  const [f, setF] = useState({ role: 'teacher', name: '', email: '', password: '', teacher_unit: '', department: '', is_class_teacher: false, class_code: '' });
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', department: '', teacher_unit: '', class_code: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState(null);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const run = async (fn) => { setMsg(null); try { const res = await fn(); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); return true; } catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); return false; } };

  const add = async (e) => { e.preventDefault(); if (await run(() => api.post('/admin/staff', f))) setF({ role: 'teacher', name: '', email: '', password: '', teacher_unit: '', department: '', is_class_teacher: false, class_code: '' }); };
  const decide = (id, decision) => run(() => api.post(`/admin/staff/${id}/decision`, { decision }));
  const setStatus = (id, status) => run(() => api.post(`/admin/staff/${id}/status`, { status }));
  const resetPassword = (u) => {
    const password = window.prompt(`New password for ${u.name} (8+ characters):`, generatePassword());
    if (password) run(() => api.post(`/admin/staff/${u.id}/password`, { password }));
  };
  const startEdit = (u) => {
    setEditingStaff(u);
    setEditForm({ name: u.name, email: u.email, department: u.department || '', teacher_unit: u.teacher_unit || '', class_code: u.class_teacher_class || '' });
    setMsg(null);
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    const saved = await run(() => api.put(`/admin/staff/${editingStaff.id}`, editForm));
    if (saved) setEditingStaff(null);
    setSavingEdit(false);
  };
  const deleteStaff = async (u) => {
    if (!window.confirm(`Permanently delete ${u.name} (${u.email})? This cannot be undone and may remove associated chat messages and Ministry reports.`)) return;
    setDeletingStaffId(u.id);
    await run(() => api.delete(`/admin/staff/${u.id}`));
    setDeletingStaffId(null);
  };

  return (
    <Page title="Staff accounts" subtitle="Teachers, HODs and Administrators">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {classesState.error && <Notice kind="error">Could not load classes for class-teacher assignment: {classesState.error}</Notice>}

      <Async state={state}>
        {(rows) => {
          const departments = [...new Set(rows.map((row) => String(row.department || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
          const filteredRows = departmentFilter ? rows.filter((row) => row.department === departmentFilter) : rows;
          const pending = filteredRows.filter((r) => r.status === 'pending');
          return (
            <>
              <Card className="flex flex-wrap items-end gap-3">
                <label className="block w-full max-w-sm">
                  <span className="mb-1 block text-xs font-bold text-gray-700">Filter staff by department</span>
                  <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                    <option value="">All departments</option>
                    {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </label>
                <span className="pb-2 text-xs text-gray-500">{filteredRows.length} of {rows.length} staff</span>
              </Card>
              {pending.length > 0 && (
                <>
                  <h2 className="text-sm font-bold text-gray-700">Waiting for approval ({pending.length})</h2>
                  <Table rows={pending} columns={[
                    { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: (r) => ROLE_LABEL[r.role] },
                    { key: 'department', label: 'Department', render: (r) => ['hod', 'teacher'].includes(r.role) ? r.department || '—' : '—' },
                    { key: 'a', label: '', render: (r) => <div className="flex gap-2"><Btn variant="ok" onClick={() => decide(r.id, 'approve')}>Approve</Btn><Btn variant="ghost" onClick={() => decide(r.id, 'reject')}>Reject</Btn></div> },
                  ]} />
                </>
              )}

              <Card className="max-w-xl">
                <form onSubmit={add} className="space-y-3">
                  <p className="text-sm font-bold text-gray-800">Add a staff member (active immediately)</p>
                  <label className="block"><span className="block text-xs font-bold text-gray-700 mb-1">Role</span>
                    <select value={f.role} onChange={(e) => setF((x) => ({ ...x, role: e.target.value, department: '', is_class_teacher: false, class_code: '' }))} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                      <option value="teacher">Teacher</option><option value="hod">Head of Department (HOD)</option><option value="admin">Administrator</option>
                    </select></label>
                  <Input label="Full name" required value={f.name} onChange={set('name')} placeholder={f.role === 'teacher' ? "Exactly as class reps will pick it, e.g. Mr. Otieno" : ''} />
                  <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
                  {['hod', 'teacher'].includes(f.role) && (
                    <label className="block">
                      <span className="block text-xs font-bold text-gray-700 mb-1">Department</span>
                      <select required value={f.department} onChange={set('department')} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                        <option value="">Choose a department</option>
                        {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                      </select>
                    </label>
                  )}
                  {f.role === 'teacher' && (
                    <>
                      <Input label="Unit / Subject taught" required maxLength={150} value={f.teacher_unit} onChange={set('teacher_unit')} placeholder="e.g. Electrical Installation" />
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={f.is_class_teacher} onChange={(e) => setF((x) => ({ ...x, is_class_teacher: e.target.checked, class_code: '' }))} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                        This teacher is a class teacher
                      </label>
                      {f.is_class_teacher && (
                        <label className="block">
                          <span className="block text-xs font-bold text-gray-700 mb-1">Class to assign</span>
                          <select required value={f.class_code} onChange={set('class_code')} disabled={classesState.loading || !classesState.data} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm disabled:opacity-60">
                            <option value="">{classesState.loading ? 'Loading classes…' : 'Choose an unassigned class'}</option>
                            {(classesState.data || []).filter((c) => !c.classTeacherId).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                          </select>
                          {!classesState.loading && classesState.data?.length === 0 && <p className="mt-1 text-xs text-amber-700">Add a class on the Classes page before assigning a class teacher.</p>}
                          {!classesState.loading && classesState.data?.length > 0 && classesState.data.every((c) => c.classTeacherId) && <p className="mt-1 text-xs text-amber-700">All classes already have a class teacher assigned.</p>}
                        </label>
                      )}
                    </>
                  )}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1"><Input label="Password (8+ characters)" type="password" required autoComplete="new-password" value={f.password} onChange={set('password')} /></div>
                    <Btn type="button" variant="ghost" onClick={() => setF((x) => ({ ...x, password: generatePassword() }))}>Generate</Btn>
                  </div>
                  <Btn type="submit">+ Add staff member</Btn>
                </form>
              </Card>

              {editingStaff && (
                <Card className="max-w-xl">
                  <form onSubmit={saveEdit} className="space-y-3">
                    <div>
                      <h2 className="text-sm font-bold text-gray-800">Edit staff details</h2>
                      <p className="text-xs text-gray-500">{ROLE_LABEL[editingStaff.role]} · account role cannot be changed here.</p>
                    </div>
                    <Input label="Full name" required maxLength={150} value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
                    <Input label="Email" type="email" required value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
                    {['teacher', 'hod'].includes(editingStaff.role) && (
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-gray-700">Department</span>
                        <select value={editForm.department} onChange={(event) => setEditForm((current) => ({ ...current, department: event.target.value }))} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                          <option value="">Choose a department</option>
                          {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                        </select>
                      </label>
                    )}
                    {editingStaff.role === 'teacher' && (
                      <>
                        <Input label="Unit / Subject taught" maxLength={150} value={editForm.teacher_unit} onChange={(event) => setEditForm((current) => ({ ...current, teacher_unit: event.target.value }))} />
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold text-gray-700">Class teacher assignment</span>
                          <select value={editForm.class_code} onChange={(event) => setEditForm((current) => ({ ...current, class_code: event.target.value }))} disabled={classesState.loading || !classesState.data} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-60">
                            <option value="">Not a class teacher</option>
                            {(classesState.data || []).filter((item) => !item.classTeacherId || Number(item.classTeacherId) === Number(editingStaff.id)).map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
                          </select>
                        </label>
                      </>
                    )}
                    <div className="flex gap-2">
                      <Btn type="submit" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</Btn>
                      <Btn type="button" variant="ghost" onClick={() => setEditingStaff(null)}>Cancel</Btn>
                    </div>
                  </form>
                </Card>
              )}

              <h2 className="text-sm font-bold text-gray-700">All staff</h2>
              <Table rows={filteredRows} empty={departmentFilter ? 'No staff are assigned to this department.' : 'No staff accounts yet.'} columns={[
                { key: 'name', label: 'Name', render: (r) => <>{r.name}{r.isMe && <span className="ml-1 text-[10px] text-blue-600 font-bold">YOU</span>}</> },
                { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: (r) => ROLE_LABEL[r.role] },
                { key: 'department', label: 'Department', render: (r) => ['hod', 'teacher'].includes(r.role) ? r.department || '—' : '—' },
                { key: 'teacher_unit', label: 'Unit / Subject', render: (r) => r.role === 'teacher' ? r.teacher_unit || <span className="text-amber-600 text-xs">not set</span> : '—' },
                { key: 'class_teacher_class', label: 'Class teacher for', render: (r) => r.role === 'teacher' ? r.class_teacher_class || '—' : '—' },
                { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status === 'inactive' ? 'rejected' : r.status)}>{r.status}</Badge> },
                { key: 'a', label: '', render: (r) => (
                  <div className="flex gap-3 text-[11px] font-bold">
                    <button onClick={() => startEdit(r)} className="text-blue-600 underline">Edit</button>
                    {!r.isMe && <button disabled={deletingStaffId === r.id} onClick={() => deleteStaff(r)} className="text-rose-600 underline disabled:opacity-50">{deletingStaffId === r.id ? 'Deleting…' : 'Delete'}</button>}
                    {!r.isMe && r.status !== 'pending' && (r.status === 'active'
                      ? <button onClick={() => setStatus(r.id, 'inactive')} className="text-rose-600 underline">Deactivate</button>
                      : <button onClick={() => setStatus(r.id, 'active')} className="text-emerald-600 underline">Activate</button>)}
                    {!r.isMe && <button onClick={() => resetPassword(r)} className="text-gray-500 underline">Set password</button>}
                  </div>
                ) },
              ]} />
            </>
          );
        }}
      </Async>
    </Page>
  );
}
