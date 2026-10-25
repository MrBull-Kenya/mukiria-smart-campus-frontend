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
            <section aria-label="Department overview" className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Stat label="Classes" value={d.totalClasses} />
              <Stat label="Students" value={d.totalStudents} />
              <Stat label="Department attendance" value={`${d.departmentAttendance}%`} tone={d.departmentAttendance >= 75 ? 'green' : 'red'} progress={d.departmentAttendance} hint="Attendance across your department" />
              <Stat label="Reps awaiting approval" value={d.pendingRepApprovals} tone={d.pendingRepApprovals ? 'amber' : 'green'} />
              <Stat label="Timetables awaiting approval" value={d.pendingTimetables} tone={d.pendingTimetables ? 'amber' : 'green'} />
              <Stat label="Barred from exams" value={d.examBlocked} tone="red" />
            </section>
            <LinkGrid Link={Link} items={[
              { to: '/hod/classes', icon: 'school', label: 'All classes' },
              { to: '/hod/approve-rep', icon: 'check', label: 'Approve class reps', primary: true },
              { to: '/hod/timetables', icon: 'calendar', label: 'Approve timetables' },
              { to: '/hod/weekly-sheets', icon: 'printer', label: 'Weekly sheets', hint: 'Attendance sheets for any class' },
              { to: '/hod/devices', icon: 'device', label: 'Device locks', hint: 'Resolve registered device issues' },
              { to: '/hod/at-risk', icon: 'warning', label: 'At-risk students' },
              { to: '/hod/exam-block-list', icon: 'ban', label: 'Exam block list' },
              { to: '/hod/lost-id-logs', icon: 'id', label: 'Lost ID logs' },
              { to: '/hod/final-reports', icon: 'chart', label: 'Final reports' },
              { to: '/hod/ministry-reports', icon: 'landmark', label: 'Ministry audits' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
