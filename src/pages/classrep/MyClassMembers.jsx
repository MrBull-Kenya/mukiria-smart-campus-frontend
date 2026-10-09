import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn, Card, Input, Notice } from '../../components/ui';

export default function MyClassMembers() {
  const state = useFetch('/classrep/members');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ adm_no: '', name: '', email: '', password: '', parent_email: '', parent_phone: '' });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const add = async (e) => {
    e.preventDefault(); setMsg(null);
    try {
      const res = await api.post('/classrep/members', f);
      setMsg({ kind: 'ok', text: res.data.message });
      setF({ adm_no: '', name: '', email: '', password: '', parent_email: '', parent_phone: '' }); setOpen(false); state.reload(true);
    } catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  const resetDevice = async (adm) => {
    if (!window.confirm(`Clear the registered phone for ${adm}? They can register a new one at their next sign-in.`)) return;
    try { const res = await api.post(`/classrep/members/${encodeURIComponent(adm)}/reset-device`); setMsg({ kind: 'ok', text: res.data.message }); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };

  return (
    <Page title="Class members" actions={<Btn onClick={() => setOpen((o) => !o)}>{open ? 'Cancel' : '+ Add student'}</Btn>}>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      {open && (
        <Card className="max-w-lg"><form onSubmit={add} className="space-y-3">
          <Input label="Admission number" required value={f.adm_no} onChange={set('adm_no')} />
          <Input label="Full name" required value={f.name} onChange={set('name')} />
          <Input label="Email" type="email" required value={f.email} onChange={set('email')} />
          <Input label="Password (8+ characters)" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set('password')} />
          <Input label="Parent email" type="email" value={f.parent_email} onChange={set('parent_email')} />
          <Input label="Parent phone" value={f.parent_phone} onChange={set('parent_phone')} />
          <Btn type="submit">Create student account</Btn>
        </form></Card>
      )}
      <Async state={state}>
        {(rows) => <Table rows={rows} columns={[
          { key: 'adm', label: 'Adm no' }, { key: 'name', label: 'Name', render: (r) => <>{r.name}{r.role === 'student_rep' && <span className="ml-1 text-[10px] text-blue-600 font-bold">REP</span>}</> },
          { key: 'attendance', label: 'Attendance', render: (r) => <Badge tone={r.atRisk ? 'red' : 'green'}>{r.attendance.toFixed(1)}%</Badge> },
          { key: 'points', label: 'Points' },
          { key: 'a', label: '', render: (r) => <button onClick={() => resetDevice(r.adm)} className="text-[11px] font-bold text-gray-500 hover:text-rose-600 underline">Reset phone</button> },
        ]} />}
      </Async>
    </Page>
  );
}
