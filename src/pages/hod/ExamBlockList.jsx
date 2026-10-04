import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn } from '../../components/ui';

export default function ExamBlockList() {
  const state = useFetch('/hod/at-risk');
  return (
    <Page title="Exam block list" subtitle="Students barred from sitting exams for attendance below the minimum" actions={<Btn variant="ghost" onClick={() => window.print()}>🖨 Print</Btn>}>
      <Async state={state}>
        {(d) => <Table rows={d.students} empty="No students are barred." columns={[
          { key: 'adm', label: 'Adm no' }, { key: 'name', label: 'Name' }, { key: 'classCode', label: 'Class' },
          { key: 'attendance', label: 'Attendance', render: (r) => `${r.attendance.toFixed(1)}%` },
          { key: 'status', label: 'Status', render: () => <Badge tone="red">Barred (&lt;{d.threshold}%)</Badge> },
        ]} />}
      </Async>
    </Page>
  );
}
