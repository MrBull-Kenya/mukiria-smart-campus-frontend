import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, Table, Btn } from '../../components/ui';

export default function FinalReports() {
  const state = useFetch('/hod/final-reports');
  return (
    <Page title="Final attendance report" subtitle={state.data ? `As of ${state.data.generatedOn}` : ''} actions={<Btn variant="ghost" onClick={() => window.print()}>🖨 Print</Btn>}>
      <Async state={state}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Registered students" value={d.totalStudents} />
              <Stat label={`Met ${d.threshold}% rule`} value={d.eligible} tone="green" />
              <Stat label="Barred" value={d.barred} tone="red" />
              <Stat label="Compliance rate" value={`${d.complianceRate}%`} tone="blue" />
            </div>
            <Table rows={d.classes} empty="No data yet." columns={[
              { key: 'code', label: 'Class' }, { key: 'students', label: 'Students' }, { key: 'avgAttendance', label: 'Avg attendance', render: (r) => `${r.avgAttendance}%` }, { key: 'eligible', label: 'Eligible' }, { key: 'barred', label: 'Barred' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
