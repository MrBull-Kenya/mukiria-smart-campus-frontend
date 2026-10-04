import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, statusTone } from '../../components/ui';

export default function MyHistory() {
  const state = useFetch('/student/history');
  return (
    <Page title="My attendance history" subtitle="Every class session your class has held">
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No sessions have been held for your class yet." columns={[
          { key: 'date', label: 'Date' }, { key: 'unit', label: 'Unit' }, { key: 'time', label: 'Checked in' },
          { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
        ]} />}
      </Async>
    </Page>
  );
}
