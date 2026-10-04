import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid } from '../../components/ui';

export default function TeacherDashboard() {
  const state = useFetch('/teacher/dashboard', { pollMs: 30000 });
  return (
    <Page title={state.data ? `Welcome, ${state.data.name}` : 'Dashboard'} subtitle="Lessons where you are the lecturer">
      <Async state={state}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Awaiting your sign-off" value={d.pendingSignoffs} tone={d.pendingSignoffs ? 'amber' : 'green'} />
              <Stat label="Sessions in progress" value={d.activeSessions} tone="blue" />
              <Stat label="Units taught" value={d.units} />
              <Stat label="At-risk students" value={d.atRiskStudents} tone="red" />
            </div>
            <LinkGrid Link={Link} items={[
              { to: '/teacher/sign-attendance', icon: '✍️', label: 'Sign attendance', hint: 'Confirm lessons' },
              { to: '/teacher/absenteeism', icon: '📉', label: 'Absenteeism by unit' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
