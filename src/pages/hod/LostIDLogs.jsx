import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, statusTone } from '../../components/ui';

export default function LostIDLogs() {
  const state = useFetch('/hod/lost-id-logs');
  return (
    <Page title="Lost ID log" subtitle="Every temporary ID request across the department">
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No temporary ID requests." columns={[
          { key: 'time', label: 'When' }, { key: 'name', label: 'Student' }, { key: 'adm', label: 'Adm no' }, { key: 'classCode', label: 'Class' }, { key: 'reason', label: 'Reason' },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
        ]} />}
      </Async>
    </Page>
  );
}
