import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn, Notice } from '../../components/ui';
import DepartmentClassFilters from '../../components/DepartmentClassFilters';

export default function ExamBlockList() {
  const state = useFetch('/hod/at-risk');
  const classesState = useFetch('/hod/classes');
  const [department, setDepartment] = useState('');
  const [classCode, setClassCode] = useState('');
  return (
    <Page title="Exam block list" subtitle="Students barred from sitting exams for attendance below the minimum" actions={<Btn variant="ghost" onClick={() => window.print()}>🖨 Print</Btn>}>
      <Async state={classesState}>
        {(classes) => (
          <>
            <DepartmentClassFilters
              classes={classes}
              department={department}
              classCode={classCode}
              onDepartmentChange={(value) => { setDepartment(value); setClassCode(''); }}
              onClassChange={setClassCode}
            />
            {state.error && <Notice kind="error">{state.error}</Notice>}
            <Async state={state}>
              {(data) => {
                const rows = data.students.filter((student) =>
                  (!department || student.department === department) && (!classCode || student.classCode === classCode)
                );
                return <Table rows={rows} empty="No students are barred for this filter." columns={[
                  { key: 'adm', label: 'Adm no' }, { key: 'name', label: 'Name' }, { key: 'department', label: 'Department', render: (row) => row.department || '—' }, { key: 'classCode', label: 'Class' },
                  { key: 'attendance', label: 'Attendance', render: (row) => `${row.attendance.toFixed(1)}%` },
                  { key: 'status', label: 'Status', render: () => <Badge tone="red">Barred (&lt;{data.threshold}%)</Badge> },
                ]} />;
              }}
            </Async>
          </>
        )}
      </Async>
    </Page>
  );
}
