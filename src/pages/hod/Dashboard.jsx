import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid, Card, ErrorBox } from '../../components/ui';

export default function HodDashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [department, setDepartment] = useState(searchParams.get('department') || '');
  useEffect(() => { setDepartment(searchParams.get('department') || ''); }, [searchParams]);
  const classes = useFetch('/admin/classes', { enabled: user.role === 'admin' });
  const state = useFetch(`/hod/dashboard${user.role === 'admin' && department ? `?department=${encodeURIComponent(department)}` : ''}`, { pollMs: 30000 });
  const departments = [...new Set((classes.data || []).map((item) => String(item.department || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const changeDepartment = (value) => {
    setDepartment(value);
    setSearchParams(value ? { department: value } : {});
  };
  return (
    <Page title={state.data ? `Welcome, ${state.data.name}` : 'Dashboard'} subtitle={state.data?.department || 'Department overview'}>
      <Async state={state}>
        {(d) => (
          <>
            {user.role === 'admin' && classes.error && <ErrorBox error={`Department choices could not be loaded: ${classes.error}`} onRetry={classes.reload} />}
            {user.role === 'admin' && <Card>
              <label className="block max-w-sm">
                <span className="mb-1 block text-xs font-bold text-slate-700">Department</span>
                <select value={department} onChange={(event) => changeDepartment(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm">
                  <option value="">All departments</option>
                  {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </Card>}
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
