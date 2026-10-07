import React, { useState } from 'react';
import { useCallback, useEffect } from 'react';
import { supabase, friendlyError } from '../../utils/supabase';
import { Page, Async, Table, Btn, Card, Input, Notice } from '../../components/ui';

const EMPTY = { class_code: '', course: '', module: '', department: '' };

export default function AdminClasses() {
  const [state, setState] = useState({ data: null, loading: true, error: '', reload: () => {} });
  const load = useCallback(async () => {
    const { data: classes, error } = await supabase.from('classes').select('*').order('class_code');
    if (error) return setState((s) => ({ ...s, loading: false, error: friendlyError(error, 'Could not load classes.') }));
    const { data: people } = await supabase.from('profiles').select('class_code, role').in('role', ['student', 'student_rep']);
    const rows = (classes || []).map((c) => ({
      code: c.class_code, course: c.course, module: c.module, department: c.department,
      students: (people || []).filter((p) => p.class_code === c.class_code).length,
      rep: (people || []).some((p) => p.class_code === c.class_code && p.role === 'student_rep') ? 'Yes' : '',
    }));
    setState((s) => ({ ...s, data: rows, loading: false, error: '' }));
  }, []);
  useEffect(() => { load(); }, [load]);
  state.reload = load;
  const [f, setF] = useState(EMPTY);
  const [editing, setEditing] = useState(false); // true = changing an existing class (its code is locked)
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const departments = [...new Set((state.data || []).map((c) => c.department).filter(Boolean))];

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const row = { class_code: f.class_code.trim(), course: f.course.trim(), module: f.module.trim(), department: f.department.trim() || null };
      const { error } = editing
        ? await supabase.from('classes').update(row).eq('class_code', row.class_code)
        : await supabase.from('classes').insert(row);
      if (error) throw error;
      setMsg({ kind: 'ok', text: editing ? 'Class updated.' : 'Class added.' }); setF(EMPTY); setEditing(false); state.reload();
    } catch (err) { setMsg({ kind: 'error', text: friendlyError(err) }); }
    setBusy(false);
  };
  const edit = (c) => { setF({ class_code: c.code, course: c.course, module: c.module, department: c.department }); setEditing(true); setMsg(null); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  const cancel = () => { setF(EMPTY); setEditing(false); setMsg(null); };
  const remove = async (code) => {
    if (!window.confirm(`Delete class ${code}? This cannot be undone.`)) return;
    try { const { error } = await supabase.from('classes').delete().eq('class_code', code); if (error) throw error; setMsg({ kind: 'ok', text: 'Class deleted.' }); state.reload(); }
    catch (err) { setMsg({ kind: 'error', text: friendlyError(err) }); }
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
          { key: 'students', label: 'Students' }, { key: 'rep', label: 'Class rep' },
          { key: 'a', label: '', render: (r) => (
            <div className="flex gap-3 text-[11px] font-bold">
              <button onClick={() => edit(r)} className="text-blue-600 underline">Edit</button>
              <button disabled={r.students > 0} onClick={() => remove(r.code)} title={r.students > 0 ? 'Classes with members cannot be deleted' : ''} className="text-rose-600 underline disabled:text-gray-300 disabled:no-underline">Delete</button>
            </div>) },
        ]} />}
      </Async>
    </Page>
  );
}
