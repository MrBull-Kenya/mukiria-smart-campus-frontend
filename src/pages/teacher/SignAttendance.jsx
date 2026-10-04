import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn, Notice } from '../../components/ui';

export default function SignAttendance() {
  const state = useFetch('/teacher/sessions');
  const [msg, setMsg] = useState(null);
  const sign = async (id) => {
    try { const res = await api.post(`/teacher/sessions/${id}/sign`); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Sign attendance" subtitle="Confirm that the class register for each lesson is correct. Signing closes the session.">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No lessons are recorded under your name yet. Class reps pick the lecturer when they start a session." columns={[
          { key: 'date', label: 'Date', render: (r) => `${r.date} ${r.time}` }, { key: 'unit', label: 'Unit' }, { key: 'classCode', label: 'Class' }, { key: 'rep', label: 'Class rep' },
          { key: 'present', label: 'Present', render: (r) => `${r.present} / ${r.total}` },
          { key: 'a', label: '', render: (r) => r.signed ? <Badge tone="green">Signed</Badge> : <Btn variant="ok" onClick={() => sign(r.id)}>Sign</Btn> },
        ]} />}
      </Async>
    </Page>
  );
}
