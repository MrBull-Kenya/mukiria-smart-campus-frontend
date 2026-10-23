import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { downloadFile } from '../../services/download';
import { Page, Async, Table, Btn, Notice, Card } from '../../components/ui';
import DepartmentClassFilters from '../../components/DepartmentClassFilters';

export default function MinistryReports() {
  const state = useFetch('/hod/ministry-audit');
  const classesState = useFetch('/hod/classes');
  const [department, setDepartment] = useState('');
  const [classCode, setClassCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await api.post('/hod/ministry-audit', { department, class_code: classCode });
      setMsg({ kind: 'ok', text: `${res.data.title} generated: ${res.data.totals.students} students, ${res.data.totals.eligible} eligible, ${res.data.totals.barred} barred.` });
      state.reload(true);
    }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    finally { setBusy(false); }
  };
  const download = async (r) => { const d = await downloadFile(`/hod/ministry-audit/${r.id}/pdf`, `ministry-audit-${r.id}.pdf`); if (!d.ok) setMsg({ kind: 'error', text: d.message }); };

  return (
    <Page title="Ministry audit reports" subtitle="A snapshot of attendance compliance for the whole department" actions={<Btn onClick={generate} disabled={busy}>{busy ? 'Generating…' : '+ Generate new audit'}</Btn>}>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={classesState}>
        {(classes) => (
          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-gray-800">Report scope</h2>
            <DepartmentClassFilters
              classes={classes}
              department={department}
              classCode={classCode}
              onDepartmentChange={(value) => { setDepartment(value); setClassCode(''); }}
              onClassChange={setClassCode}
            />
            <p className="text-xs text-gray-500">The selected department or class is saved into the audit and included in its PDF.</p>
          </Card>
        )}
      </Async>
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No audits generated yet." columns={[
          { key: 'date', label: 'Generated' }, { key: 'title', label: 'Report' },
          { key: 'a', label: '', render: (r) => <Btn variant="ghost" onClick={() => download(r)}>⬇ PDF</Btn> },
        ]} />}
      </Async>
    </Page>
  );
}
