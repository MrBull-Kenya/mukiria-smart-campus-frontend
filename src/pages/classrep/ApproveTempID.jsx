import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Btn, Notice } from '../../components/ui';

export default function ApproveTempID() {
  const state = useFetch('/classrep/temp-ids', { pollMs: 20000 });
  const [msg, setMsg] = useState(null);
  const decide = async (id, decision) => {
    try { const res = await api.post(`/classrep/temp-ids/${id}/decision`, { decision }); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Temporary ID requests" subtitle="Approved IDs are valid for 24 hours">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No pending requests." columns={[
          { key: 'time', label: 'Requested' }, { key: 'name', label: 'Student' }, { key: 'adm', label: 'Adm no' }, { key: 'reason', label: 'Reason' },
          { key: 'a', label: '', render: (r) => <div className="flex gap-2"><Btn variant="ok" onClick={() => decide(r.id, 'approved')}>Approve</Btn><Btn variant="ghost" onClick={() => decide(r.id, 'rejected')}>Reject</Btn></div> },
        ]} />}
      </Async>
    </Page>
  );
}
