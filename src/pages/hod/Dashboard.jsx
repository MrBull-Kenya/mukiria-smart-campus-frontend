import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid } from '../../components/ui';

export default function HodDashboard() {
  const state = useFetch('/hod/dashboard', { pollMs: 30000 });
  return (
    <Page title={state.data ? `Welcome, ${state.data.name}` : 'Dashboard'} subtitle="Department overview">
      <Async state={state}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Classes" value={d.totalClasses} />
              <Stat label="Students" value={d.totalStudents} />
              <Stat label="Department attendance" value={`${d.departmentAttendance}%`} tone={d.departmentAttendance >= 75 ? 'green' : 'red'} />
              <Stat label="Reps awaiting approval" value={d.pendingRepApprovals} tone={d.pendingRepApprovals ? 'amber' : 'green'} />
              <Stat label="Timetables awaiting approval" value={d.pendingTimetables} tone={d.pendingTimetables ? 'amber' : 'green'} />
              <Stat label="Barred from exams" value={d.examBlocked} tone="red" />
            </div>
            <LinkGrid Link={Link} items={[
              { to: '/hod/classes', icon: '🏫', label: 'All classes' },
              { to: '/hod/approve-rep', icon: '✅', label: 'Approve class reps' },
              { to: '/hod/timetables', icon: '🗓️', label: 'Approve timetables' },
              { to: '/hod/weekly-sheets', icon: '🖨️', label: 'Weekly sheets', hint: 'Any class' },
              { to: '/hod/devices', icon: '📱', label: 'Device locks', hint: 'Fix "Device mismatch"' },
              { to: '/hod/at-risk', icon: '⚠️', label: 'At-risk students' },
              { to: '/hod/exam-block-list', icon: '🚫', label: 'Exam block list' },
              { to: '/hod/lost-id-logs', icon: '🪪', label: 'Lost ID logs' },
              { to: '/hod/final-reports', icon: '📊', label: 'Final reports' },
              { to: '/hod/ministry-reports', icon: '🏛️', label: 'Ministry audits' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
