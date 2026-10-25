import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Badge, Btn, Notice, Stat, Icon } from '../../components/ui';
import DepartmentClassFilters from '../../components/DepartmentClassFilters';

export default function ExamBlockList() {
  const state = useFetch('/hod/at-risk');
  const classesState = useFetch('/hod/classes');
  const [department, setDepartment] = useState('');
  const [classCode, setClassCode] = useState('');
  return (
    <Page title="Exam block list" subtitle="Students below the minimum attendance required for exam eligibility" actions={<Btn variant="ghost" className="print:hidden" onClick={() => window.print()}><span className="inline-flex items-center gap-2"><Icon name="printer" className="h-4 w-4" />Print list</span></Btn>}>
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
                    <Stat label="Students on this list" value={rows.length} tone={rows.length ? 'red' : 'green'} hint={rows.length ? `Attendance below ${data.threshold}%` : 'No students match these filters'} />
                    <Table rows={rows} empty="No students are currently on the exam block list for this filter." columns={[
                  { key: 'adm', label: 'Adm no' }, { key: 'name', label: 'Name' }, { key: 'department', label: 'Department', render: (row) => row.department || '—' }, { key: 'classCode', label: 'Class' },
                  { key: 'attendance', label: 'Attendance', render: (row) => `${Number(row.attendance).toFixed(1)}%` },
                  { key: 'status', label: 'Status', render: () => <Badge tone="red">Barred (&lt;{data.threshold}%)</Badge> },
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
