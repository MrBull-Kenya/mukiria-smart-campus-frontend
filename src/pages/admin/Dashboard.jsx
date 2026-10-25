import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid, Notice, ErrorBox } from '../../components/ui';

export default function AdminDashboard() {
  const state = useFetch('/admin/dashboard', { pollMs: 30000 });
  const classes = useFetch('/admin/classes');
  const [department, setDepartment] = useState('');
  const departments = [...new Set((classes.data || []).map((item) => String(item.department || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return (
    <Page title={state.data ? `Welcome, ${state.data.name}` : 'Administrator'} subtitle="Classes and staff accounts for the whole institute">
      <Async state={state}>
        {(d) => (
          <>
            {classes.error && <ErrorBox error={`Department choices could not be loaded: ${classes.error}`} onRetry={classes.reload} />}
            {d.pendingStaff > 0 && <Notice kind="warn"><strong>{d.pendingStaff}</strong> staff registration(s) are waiting for your approval. <Link to="/admin/staff" className="underline font-bold">Review</Link></Notice>}
            {!d.termStart && <Notice kind="info">The term start date isn't set, so printed attendance registers will have a blank WEEK number. <Link to="/admin/settings" className="underline font-bold">Set it</Link></Notice>}
            {d.classes === 0 && <Notice kind="info">No classes exist yet, so nobody can register as a student. <Link to="/admin/classes" className="underline font-bold">Add the first class</Link></Notice>}
            <section aria-label="Institute account summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Classes" value={d.classes} tone="blue" />
              <Stat label="Students" value={d.students} />
              <Stat label="Class reps" value={d.reps} />
              <Stat label="Teachers" value={d.teachers} />
              <Stat label="HODs" value={d.hods} />
              <Stat label="Administrators" value={d.admins} />
              <Stat label="Staff awaiting approval" value={d.pendingStaff} tone={d.pendingStaff ? 'amber' : 'green'} />
              <Stat label="Reps awaiting HOD" value={d.pendingReps} tone={d.pendingReps ? 'amber' : 'green'} />
            </section>
            <LinkGrid Link={Link} items={[
              { to: '/admin/classes', icon: 'school', label: 'Classes', hint: 'Add or manage institute classes' },
              { to: '/admin/staff', icon: 'users', label: 'Staff accounts', hint: 'Approve, add, edit, and deactivate' , primary: true },
              { to: '/admin/activity', icon: 'activity', label: 'Live activity log', hint: 'Review recent account actions' },
              { to: '/admin/settings', icon: 'settings', label: 'Settings', hint: 'Configure the current term' },
              { to: `/hod/dashboard${department ? `?department=${encodeURIComponent(department)}` : ''}`, icon: 'chart', label: 'Department overview', hint: 'Review attendance and reports by department' },
            ]} />
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block max-w-sm">
                <span className="mb-1 block text-xs font-bold text-slate-700">Department overview filter</span>
                <select value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">All departments</option>
                  {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <p className="mt-2 text-xs text-slate-500">The Department overview button opens the selected department’s dashboard.</p>
            </section>
          </>
        )}
      </Async>
    </Page>
  );
}
