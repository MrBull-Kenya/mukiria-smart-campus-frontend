import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { Page, Async, Table, Badge, Btn, Card, Input, Notice } from '../../components/ui';

export default function AllClasses() {
  const state = useFetch('/hod/classes');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedClass, setSelectedClass] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', parent_email: '', parent_phone: '' });
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const toggleMembers = async (classRow) => {
    if (selectedClass?.code === classRow.code) {
      setSelectedClass(null); setMembers([]); setEditingMember(null); setMsg(null);
      return;
    }
    setSelectedClass(classRow); setMembers([]); setEditingMember(null); setMsg(null); setMembersError(''); setMembersLoading(true);
    try {
      const { data } = await api.get('/admin/class-members', { params: { code: classRow.code } });
      setMembers(data);
    } catch (err) {
      setMembersError(getErrorMessage(err, 'Could not load class members.'));
    } finally {
      setMembersLoading(false);
    }
  };

  const startEdit = (member) => {
    setEditingMember(member);
    setForm({ name: member.name, email: member.email, parent_email: member.parent_email || '', parent_phone: member.parent_phone || '' });
    setMsg(null);
  };

  const saveMember = async (event) => {
    event.preventDefault();
    if (!selectedClass || !editingMember) return;
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.put('/admin/class-members', {
        code: selectedClass.code,
        user_id: editingMember.id,
        ...form,
      });
      setMsg({ kind: 'ok', text: data.message });
      setEditingMember(null);
      const { data: updated } = await api.get('/admin/class-members', { params: { code: selectedClass.code } });
      setMembers(updated);
    } catch (err) {
      setMsg({ kind: 'error', text: getErrorMessage(err, 'Could not update member details.') });
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (member) => {
    const identity = member.adm_no ? `${member.name} (${member.adm_no})` : member.name;
    if (!window.confirm(`Permanently delete ${identity}? This removes their account, attendance history, and related student records. This cannot be undone.`)) return;
    setRemovingId(member.id); setMsg(null);
    try {
      const { data } = await api.delete('/admin/class-members', { params: { code: selectedClass.code, user_id: member.id } });
      setMsg({ kind: 'ok', text: data.message });
      if (editingMember?.id === member.id) setEditingMember(null);
      const [{ data: updated }] = await Promise.all([
        api.get('/admin/class-members', { params: { code: selectedClass.code } }),
        state.reload(true),
      ]);
      setMembers(updated);
    } catch (err) {
      setMsg({ kind: 'error', text: getErrorMessage(err, 'Could not delete this member.') });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Page title="All classes" subtitle={isAdmin ? 'View class rosters, update member contact details, or permanently delete a member.' : undefined}>
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No classes exist yet." columns={[
          { key: 'code', label: 'Class' }, { key: 'course', label: 'Course' }, { key: 'module', label: 'Module' }, { key: 'students', label: 'Students' },
          { key: 'attendance', label: 'Avg attendance', render: (r) => <Badge tone={r.students === 0 ? 'gray' : r.attendance >= 75 ? 'green' : 'red'}>{r.students ? `${r.attendance}%` : '—'}</Badge> },
          { key: 'rep', label: 'Class rep' },
          ...(isAdmin ? [{ key: 'members', label: '', render: (r) => (
            <button onClick={() => toggleMembers(r)} className="text-[11px] font-bold text-blue-600 underline whitespace-nowrap">
              {selectedClass?.code === r.code ? 'Hide Members' : 'View Members'}
            </button>
          ) }] : []),
        ]} />}
      </Async>
      {isAdmin && selectedClass && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-gray-900">Members of {selectedClass.code}</h2>
              <p className="text-xs text-gray-500">Edit names and contact details, or permanently delete an account and its related records.</p>
            </div>
            <Btn variant="ghost" onClick={() => { setSelectedClass(null); setMembers([]); setEditingMember(null); }}>Close</Btn>
          </div>
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          {membersError && <Notice kind="error">{membersError}</Notice>}
          {membersLoading ? <p className="text-sm text-gray-500">Loading members…</p> : (
            <Table rows={members} empty="No registered students or class reps in this class." columns={[
              { key: 'adm_no', label: 'Admission no.', render: (r) => r.adm_no || '—' },
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'parent_email', label: 'Parent email', render: (r) => r.parent_email || '—' },
              { key: 'parent_phone', label: 'Parent phone', render: (r) => r.parent_phone || '—' },
              { key: 'role', label: 'Role', render: (r) => r.role === 'student_rep' ? 'Class rep' : 'Student' },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'green' : r.status === 'pending' ? 'amber' : 'gray'}>{r.status}</Badge> },
              { key: 'actions', label: '', render: (r) => (
                <div className="flex gap-3 text-[11px] font-bold">
                  <button onClick={() => startEdit(r)} className="text-blue-600 underline">Edit</button>
                  <button disabled={removingId === r.id} onClick={() => removeMember(r)} className="text-rose-600 underline disabled:opacity-50">
                    {removingId === r.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              ) },
            ]} />
          )}
          {editingMember && (
            <form onSubmit={saveMember} className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <h3 className="text-sm font-bold text-gray-900">Edit {editingMember.name} ({editingMember.adm_no || 'No admission number'})</h3>
                <p className="mt-1 text-xs text-gray-500">Class, role, admission number, and account status are not changed here.</p>
              </div>
              <Input label="Full name" required maxLength={150} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Email" type="email" required maxLength={254} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <Input label="Parent email" type="email" maxLength={254} value={form.parent_email} onChange={(e) => setForm((f) => ({ ...f, parent_email: e.target.value }))} />
              <Input label="Parent phone" maxLength={50} value={form.parent_phone} onChange={(e) => setForm((f) => ({ ...f, parent_phone: e.target.value }))} />
              <div className="flex gap-2 md:col-span-2">
                <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</Btn>
                <Btn type="button" variant="ghost" disabled={busy} onClick={() => setEditingMember(null)}>Cancel</Btn>
              </div>
            </form>
          )}
        </Card>
      )}
    </Page>
  );
}
