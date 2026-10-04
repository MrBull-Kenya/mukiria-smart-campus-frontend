import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge } from '../../components/ui';

export default function AtRiskStudents() {
  const state = useFetch('/hod/at-risk');
  return (
    <Page title="At-risk students" subtitle="Attendance below the exam threshold">
      <Async state={state}>
        {(d) => <Table rows={d.students} empty={`Nobody is below ${d.threshold}%. 🎉`} columns={[
          { key: 'name', label: 'Name' }, { key: 'adm', label: 'Adm no' }, { key: 'classCode', label: 'Class' },
          { key: 'attendance', label: 'Attendance', render: (r) => <Badge tone="red">{r.attendance.toFixed(1)}%</Badge> }, { key: 'missed', label: 'Sessions missed' },
        ]} />}
      </Async>
    </Page>
  );
}
