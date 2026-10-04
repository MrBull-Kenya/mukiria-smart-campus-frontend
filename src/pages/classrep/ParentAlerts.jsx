import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Btn, Notice } from '../../components/ui';

export default function ParentAlerts() {
  const state = useFetch('/classrep/parent-alerts');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setMsg(null);
    try { const res = await api.post('/classrep/parent-alerts/run'); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };
  return (
    <Page title="Parent alerts" subtitle="Notify parents of students whose attendance fell below 75% (once per student per day)" actions={<Btn onClick={run} disabled={busy}>{busy ? 'Working…' : 'Alert parents of at-risk students'}</Btn>}>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No alerts have been sent." columns={[
          { key: 'time', label: 'When' }, { key: 'student', label: 'Student' }, { key: 'parent', label: 'Parent email' }, { key: 'reason', label: 'Reason' }, { key: 'delivery', label: 'Delivery' },
        ]} />}
      </Async>
    </Page>
  );
}
