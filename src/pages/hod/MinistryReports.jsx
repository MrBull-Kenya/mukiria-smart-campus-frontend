import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { downloadFile } from '../../services/download';
import { Page, Async, Table, Btn, Notice } from '../../components/ui';

export default function MinistryReports() {
  const state = useFetch('/hod/ministry-audit');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true); setMsg(null);
    try { const res = await api.post('/hod/ministry-audit'); setMsg({ kind: 'ok', text: `${res.data.title} generated: ${res.data.totals.students} students, ${res.data.totals.eligible} eligible, ${res.data.totals.barred} barred.` }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };
  const download = async (r) => { const d = await downloadFile(`/hod/ministry-audit/${r.id}/pdf`, `ministry-audit-${r.id}.pdf`); if (!d.ok) setMsg({ kind: 'error', text: d.message }); };

  return (
    <Page title="Ministry audit reports" subtitle="A snapshot of attendance compliance for the whole department" actions={<Btn onClick={generate} disabled={busy}>{busy ? 'Generating…' : '+ Generate new audit'}</Btn>}>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No audits generated yet." columns={[
          { key: 'date', label: 'Generated' }, { key: 'title', label: 'Report' },
          { key: 'a', label: '', render: (r) => <Btn variant="ghost" onClick={() => download(r)}>⬇ PDF</Btn> },
        ]} />}
      </Async>
    </Page>
  );
}
