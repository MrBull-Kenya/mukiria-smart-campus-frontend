import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Notice, Stat } from '../../components/ui';
import DepartmentClassFilters from '../../components/DepartmentClassFilters';

export default function AtRiskStudents() {
  const state = useFetch('/hod/at-risk');
  const classesState = useFetch('/hod/classes');
  const [department, setDepartment] = useState('');
  const [classCode, setClassCode] = useState('');
  return (
    <Page title="At-risk students" subtitle="Attendance below the exam threshold">
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
                return (
                  <>
                    <Stat label="Students at risk" value={rows.length} tone={rows.length ? 'amber' : 'green'} hint={rows.length ? `Attendance below ${data.threshold}%` : 'No students match these filters'} />
                    <Table rows={rows} empty={`No students are below ${data.threshold}% attendance for this filter.`} columns={[
                  { key: 'name', label: 'Name' }, { key: 'adm', label: 'Adm no' }, { key: 'department', label: 'Department', render: (row) => row.department || '—' }, { key: 'classCode', label: 'Class' },
                  { key: 'attendance', label: 'Attendance', render: (row) => <Badge tone="red">{Number(row.attendance).toFixed(1)}%</Badge> }, { key: 'missed', label: 'Sessions missed' },
                    ]} pageSize={25} searchable />
                  </>
                );
              }}
            </Async>
          </>
        )}
      </Async>
    </Page>
  );
}
