import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Card, Btn, Notice, Async, Table, Badge, statusTone } from '../../components/ui';

export default function RequestTempID() {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const list = useFetch('/student/temp-id');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await api.post('/student/temp-id', { reason });
      setMsg({ kind: 'ok', text: res.data.message }); setReason(''); list.reload(true);
    } catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };

  return (
    <Page title="Request a temporary ID" subtitle="Your class rep approves it; it is valid for 24 hours">
      <Card className="max-w-lg">
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs font-bold text-gray-700">Why do you need one?</label>
          <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. I lost my ID card on the way to school"
            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
          {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          <Btn type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit request'}</Btn>
        </form>
      </Card>
      <h2 className="text-sm font-bold text-gray-700">My requests</h2>
      <Async state={list}>
        {(rows) => <Table rows={rows} empty="You haven't requested a temporary ID." columns={[
          { key: 'requested', label: 'Requested' }, { key: 'reason', label: 'Reason' },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
          { key: 'expires', label: 'Valid until', render: (r) => r.expires || '—' },
        ]} />}
      </Async>
    </Page>
  );
}
