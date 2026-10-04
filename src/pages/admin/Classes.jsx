import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Btn, Card, Input, Notice } from '../../components/ui';

export default function AdminClasses() {
  const state = useFetch('/admin/classes');
  const [f, setF] = useState({ class_code: '', course: '', module: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { const res = await api.post('/admin/classes', f); setMsg({ kind: 'ok', text: res.data.message }); setF({ class_code: '', course: '', module: '' }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };
  const remove = async (code) => {
    if (!window.confirm(`Delete class ${code}? This cannot be undone.`)) return;
    try { const res = await api.delete('/admin/classes', { params: { code } }); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };

  return (
    <Page title="Classes" subtitle="Students and class reps pick their class from this list when they register">
      <Card className="max-w-xl">
        <form onSubmit={add} className="space-y-3">
          <p className="text-sm font-bold text-gray-800">Add a class</p>
          <Input label="Class code" required value={f.class_code} onChange={set('class_code')} placeholder="e.g. ITECH6/S/24/J/M/25" />
          <Input label="Course" required value={f.course} onChange={set('course')} placeholder="e.g. Information Technology" />
          <Input label="Module" required value={f.module} onChange={set('module')} placeholder="e.g. Module 6" />
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          <Btn type="submit" disabled={busy}>{busy ? 'Adding…' : '+ Add class'}</Btn>
        </form>
      </Card>
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No classes yet. Add the first one above." columns={[
          { key: 'code', label: 'Class code' }, { key: 'course', label: 'Course' }, { key: 'module', label: 'Module' }, { key: 'students', label: 'Students' }, { key: 'rep', label: 'Class rep' },
          { key: 'a', label: '', render: (r) => <button disabled={r.students > 0} onClick={() => remove(r.code)} title={r.students > 0 ? 'Classes with members cannot be deleted' : ''} className="text-[11px] font-bold text-rose-600 underline disabled:text-gray-300 disabled:no-underline">Delete</button> },
        ]} />}
      </Async>
    </Page>
  );
}
