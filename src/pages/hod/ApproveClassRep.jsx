import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Btn, Notice } from '../../components/ui';

export default function ApproveClassRep() {
  const state = useFetch('/hod/pending-reps');
  const [msg, setMsg] = useState(null);
  const decide = async (id, decision) => {
    try { const res = await api.post(`/hod/approve-rep/${id}`, { decision }); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Approve class representatives" subtitle="Reps can't sign in until you approve them">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No class reps are waiting for approval." columns={[
          { key: 'name', label: 'Name' }, { key: 'adm', label: 'Adm no' }, { key: 'email', label: 'Email' }, { key: 'classCode', label: 'Class' },
          { key: 'a', label: '', render: (r) => <div className="flex gap-2"><Btn variant="ok" onClick={() => decide(r.id, 'approve')}>Approve</Btn><Btn variant="ghost" onClick={() => decide(r.id, 'reject')}>Reject</Btn></div> },
        ]} />}
      </Async>
    </Page>
  );
}
