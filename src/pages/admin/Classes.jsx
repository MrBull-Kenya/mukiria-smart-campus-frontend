import React, { useState } from 'react';
import { useCallback, useEffect } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { Page, Async, Table, Btn, Card, Input, Notice, Badge } from '../../components/ui';

const EMPTY = { class_code: '', course: '', module: '', department: '', class_teacher_id: '' };

export default function AdminClasses() {
  const [state, setState] = useState({ data: null, loading: true, error: '', reload: () => {} });
  const [teachers, setTeachers] = useState([]);
  const [teachersError, setTeachersError] = useState('');
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/classes');
      setState((s) => ({ ...s, data, loading: false, error: '' }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: getErrorMessage(err, 'Could not load classes.') }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/classrep/lecturers')
      .then(({ data }) => setTeachers(data))
      .catch((err) => setTeachersError(getErrorMessage(err, 'Could not load active teachers.')));
  }, []);
  state.reload = load;
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(false); // true = changing an existing class (its code is locked)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [membersMsg, setMembersMsg] = useState(null);
  const [removingUserId, setRemovingUserId] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const departments = [...new Set((state.data || []).map((c) => c.department).filter(Boolean))];

  const loadMembers = async (classCode) => {
    setMembersLoading(true); setMembersError(''); setMembersMsg(null);
    try {
      const { data } = await api.get('/admin/class-members', { params: { code: classCode } });
      setMembers(data);
    } catch (err) {
      setMembersError(getErrorMessage(err, 'Could not load class members.'));
    } finally {
      setMembersLoading(false);
    }
  };
  const toggleMembers = (classRow) => {
    if (selectedClass?.code === classRow.code) {
      setSelectedClass(null); setMembers([]); setMembersMsg(null);
      return;
    }
    setSelectedClass(classRow);
    loadMembers(classRow.code);
  };
  const removeMember = async (member) => {
    const identity = member.adm_no ? `${member.name} (${member.adm_no})` : member.name;
    if (!window.confirm(`Permanently delete ${identity}? This removes their account, attendance history, and related student records. This cannot be undone.`)) return;
    setRemovingUserId(member.id); setMembersMsg(null);
    try {
      const { data } = await api.delete('/admin/class-members', { params: { code: selectedClass.code, user_id: member.id } });
      setMembersMsg({ kind: 'ok', text: data.message });
      await Promise.all([loadMembers(selectedClass.code), load()]);
    } catch (err) {
      setMembersMsg({ kind: 'error', text: getErrorMessage(err, 'Could not delete this member.') });
    } finally {
      setRemovingUserId(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const row = { class_code: f.class_code.trim(), course: f.course.trim(), module: f.module.trim(), department: f.department.trim() || null, class_teacher_id: f.class_teacher_id || null };
      const result = editing
        ? await api.put('/admin/classes', row)
        : await api.post('/admin/classes', row);
      if (!result.data) throw new Error('The server did not confirm the class change.');
      setMsg({ kind: 'ok', text: editing ? 'Class updated.' : 'Class added.' }); setF(EMPTY); setEditing(false); state.reload();
    } catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };
  const edit = (c) => { setF({ class_code: c.code, course: c.course, module: c.module, department: c.department, class_teacher_id: c.classTeacherId || '' }); setEditing(true); setMsg(null); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  const cancel = () => { setF(EMPTY); setEditing(false); setMsg(null); };
  const remove = async (code) => {
    if (!window.confirm(`Delete class ${code}? This cannot be undone.`)) return;
    try { await api.delete('/admin/classes', { params: { code } }); setMsg({ kind: 'ok', text: 'Class deleted.' }); state.reload(); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };

  return (
    <Page title="Classes" subtitle="Students and class reps pick their class from this list when they register">
      <Card className="max-w-xl">
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm font-bold text-gray-800">{editing ? `Edit class ${f.class_code}` : 'Add a class'}</p>
          <Input label="Class code" required value={f.class_code} onChange={set('class_code')} disabled={editing} placeholder="e.g. ITECH6/S/24/J/M/25" />
          <Input label="Course" required value={f.course} onChange={set('course')} placeholder="e.g. Information Technology" />
          <Input label="Module" required value={f.module} onChange={set('module')} placeholder="e.g. Module 6" />
          <Input label="Department (printed on the attendance register)" list="department-list" value={f.department} onChange={set('department')} placeholder="e.g. Computing & Informatics" />
          <datalist id="department-list">{departments.map((d) => <option key={d} value={d} />)}</datalist>
          <label className="block">
            <span className="block text-xs font-bold text-gray-700 mb-1">Class teacher (printed on the attendance register)</span>
            <select value={f.class_teacher_id} onChange={set('class_teacher_id')} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500">
              <option value="">Not assigned</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
          </label>
          {teachersError && <Notice kind="error">{teachersError}</Notice>}
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          <div className="flex gap-2">
            <Btn type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : '+ Add class'}</Btn>
            {editing && <Btn type="button" variant="ghost" onClick={cancel}>Cancel</Btn>}
          </div>
        </form>
      </Card>
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No classes yet. Add the first one above." columns={[
          { key: 'code', label: 'Class code' }, { key: 'course', label: 'Course' }, { key: 'module', label: 'Module' },
          { key: 'department', label: 'Department', render: (r) => r.department || <span className="text-amber-600 text-xs">not set</span> },
          { key: 'classTeacher', label: 'Class teacher', render: (r) => r.classTeacher || <span className="text-amber-600 text-xs">not assigned</span> },
          { key: 'students', label: 'Students' }, { key: 'rep', label: 'Class rep' },
          { key: 'a', label: '', render: (r) => (
            <div className="flex gap-3 text-[11px] font-bold">
              <button onClick={() => toggleMembers(r)} className="text-blue-600 underline whitespace-nowrap">{selectedClass?.code === r.code ? 'Hide members' : 'View members'}</button>
              <button onClick={() => edit(r)} className="text-blue-600 underline">Edit</button>
              <button disabled={r.students > 0} onClick={() => remove(r.code)} title={r.students > 0 ? 'Classes with members cannot be deleted' : ''} className="text-rose-600 underline disabled:text-gray-300 disabled:no-underline">Delete</button>
            </div>) },
        ]} />}
      </Async>
      {selectedClass && (
        <Card className="space-y-3">
          <div>
            <h2 className="text-sm font-black text-gray-900">Members of {selectedClass.code}</h2>
            <p className="text-xs text-gray-500">Deleting a member permanently removes their account, attendance history, and related student records.</p>
          </div>
          {membersMsg && <Notice kind={membersMsg.kind}>{membersMsg.text}</Notice>}
          {membersError && <Notice kind="error">{membersError}</Notice>}
          {membersLoading ? <p className="text-sm text-gray-500">Loading members…</p> : (
            <Table rows={members} empty="No registered students or class reps in this class." columns={[
              { key: 'adm_no', label: 'Admission number', render: (r) => r.adm_no || '—' },
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role', render: (r) => r.role === 'student_rep' ? 'Class rep' : 'Student' },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'green' : r.status === 'pending' ? 'amber' : 'gray'}>{r.status}</Badge> },
              { key: 'attendance', label: 'Attendance', render: (r) => r.attendance == null ? '—' : `${r.attendance.toFixed(1)}%` },
              { key: 'actions', label: '', render: (r) => (
                <button disabled={removingUserId === r.id} onClick={() => removeMember(r)} className="text-[11px] font-bold text-rose-600 underline disabled:opacity-50">
                  {removingUserId === r.id ? 'Deleting…' : 'Delete'}
                </button>
              ) },
            ]} />
          )}
        </Card>
      )}
    </Page>
  );
}
