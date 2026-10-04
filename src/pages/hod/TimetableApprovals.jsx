import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import FileActions from '../../components/FileActions';
import { Page, Async, Table, Badge, Btn, Notice, statusTone } from '../../components/ui';

export default function TimetableApprovals() {
  const state = useFetch('/hod/timetables');
  const [msg, setMsg] = useState(null);
  const decide = async (id, decision) => {
    const comment = decision === 'rejected' ? window.prompt('Reason for rejecting (shown to the class rep):') : '';
    if (decision === 'rejected' && comment === null) return;
    try { const res = await api.post(`/hod/timetables/${id}/decision`, { decision, comment }); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Timetable approvals" subtitle="Timetables uploaded by class reps. Open the file to review it before approving.">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No timetables uploaded yet." columns={[
          { key: 'date', label: 'Uploaded' }, { key: 'classCode', label: 'Class' }, { key: 'term', label: 'Term' },
          { key: 'file', label: 'File', render: (r) => r.file ? <span>{r.file.name}{r.slots > 0 && <span className="text-[11px] text-gray-400"> · {r.slots} lessons</span>}</span> : `${r.slots} lessons` },
          { key: 'open', label: '', render: (r) => <FileActions url={`/hod/timetables/${r.id}/file`} file={r.file} /> },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
          { key: 'a', label: '', render: (r) => r.status === 'pending' ? <div className="flex gap-2"><Btn variant="ok" onClick={() => decide(r.id, 'approved')}>Approve</Btn><Btn variant="ghost" onClick={() => decide(r.id, 'rejected')}>Reject</Btn></div> : null },
        ]} />}
      </Async>
    </Page>
  );
}
