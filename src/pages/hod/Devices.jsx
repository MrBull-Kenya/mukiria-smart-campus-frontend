import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn, Card, Notice } from '../../components/ui';

export default function HodDevices() {
  const classes = useFetch('/hod/classes');
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const [cls, setCls] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => { const t = setTimeout(() => setSearch(typed.trim()), 300); return () => clearTimeout(t); }, [typed]); // wait for the typing to pause
  const qs = new URLSearchParams();
  if (cls) qs.set('class_code', cls);
  if (search) qs.set('search', search);
  const state = useFetch(`/hod/devices${qs.toString() ? `?${qs}` : ''}`);

  const reset = async (s) => {
    if (!window.confirm(`Clear the registered device for ${s.name} (${s.adm})?\n\nThey will be able to sign in on a new device, and that device becomes their registered one.`)) return;
    setMsg(null);
    try { const res = await api.post(`/hod/students/${encodeURIComponent(s.adm)}/reset-device`); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };

  return (
    <Page title="Device locks" subtitle="Students and class reps can only sign in on the first device they used">
      <Notice kind="info">
        If someone sees <strong>"Device mismatch"</strong> when signing in (new phone, cleared browser data, or opening the app from a different address such as <em>localhost</em> instead of the network address),
        find them below and press <strong>Reset device</strong>. Their next sign-in registers the new device.
      </Notice>
      <Card className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[14rem]">
          <span className="block text-xs font-bold text-gray-700 mb-1">Find a student</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Name, admission number or email" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
        </label>
        <label className="block">
          <span className="block text-xs font-bold text-gray-700 mb-1">Class</span>
          <select value={cls} onChange={(e) => setCls(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
            <option value="">All classes</option>
            {(classes.data || []).map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </label>
      </Card>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(d) => (
          <>
            {d.truncated && <Notice kind="warn">Showing the first 200 matches. Type a name or admission number to narrow it down.</Notice>}
            <Table rows={d.students} empty="No students match." columns={[
              { key: 'name', label: 'Name', render: (r) => <>{r.name}{r.role === 'student_rep' && <span className="ml-1 text-[10px] text-blue-600 font-bold">REP</span>}</> },
              { key: 'adm', label: 'Adm no' }, { key: 'classCode', label: 'Class' }, { key: 'email', label: 'Email' },
              { key: 'registered', label: 'Registered device', render: (r) => r.registered ? <span><Badge tone="green">Registered</Badge> <span className="text-[11px] text-gray-500">{r.since}</span></span> : <Badge tone="gray">Not registered yet</Badge> },
              { key: 'a', label: '', render: (r) => <Btn variant="ghost" disabled={!r.registered} onClick={() => reset(r)}>Reset device</Btn> },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
