import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge } from '../../components/ui';

export default function AllClasses() {
  const state = useFetch('/hod/classes');
  return (
    <Page title="All classes">
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No classes exist yet." columns={[
          { key: 'code', label: 'Class' }, { key: 'course', label: 'Course' }, { key: 'module', label: 'Module' }, { key: 'students', label: 'Students' },
          { key: 'attendance', label: 'Avg attendance', render: (r) => <Badge tone={r.students === 0 ? 'gray' : r.attendance >= 75 ? 'green' : 'red'}>{r.students ? `${r.attendance}%` : '—'}</Badge> },
          { key: 'rep', label: 'Class rep' },
        ]} />}
      </Async>
    </Page>
  );
}
