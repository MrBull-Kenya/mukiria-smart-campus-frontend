import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid, Notice } from '../../components/ui';

export default function AdminDashboard() {
  const state = useFetch('/admin/dashboard', { pollMs: 30000 });
  return (
    <Page title={state.data ? `Welcome, ${state.data.name}` : 'Administrator'} subtitle="Classes and staff accounts for the whole institute">
      <Async state={state}>
        {(d) => (
          <>
            {d.pendingStaff > 0 && <Notice kind="warn"><strong>{d.pendingStaff}</strong> staff registration(s) are waiting for your approval. <Link to="/admin/staff" className="underline font-bold">Review</Link></Notice>}
            {!d.termStart && <Notice kind="info">The term start date isn't set, so printed attendance registers will have a blank WEEK number. <Link to="/admin/settings" className="underline font-bold">Set it</Link></Notice>}
            {d.classes === 0 && <Notice kind="info">No classes exist yet, so nobody can register as a student. <Link to="/admin/classes" className="underline font-bold">Add the first class</Link></Notice>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Classes" value={d.classes} tone="blue" />
              <Stat label="Students" value={d.students} />
              <Stat label="Class reps" value={d.reps} />
              <Stat label="Teachers" value={d.teachers} />
              <Stat label="HODs" value={d.hods} />
              <Stat label="Administrators" value={d.admins} />
              <Stat label="Staff awaiting approval" value={d.pendingStaff} tone={d.pendingStaff ? 'amber' : 'green'} />
              <Stat label="Reps awaiting HOD" value={d.pendingReps} tone={d.pendingReps ? 'amber' : 'green'} />
            </div>
            <LinkGrid Link={Link} items={[
              { to: '/admin/classes', icon: '🏫', label: 'Classes', hint: 'Add or remove classes' },
              { to: '/admin/staff', icon: '👥', label: 'Staff accounts', hint: 'Approve, add, deactivate' },
              { to: '/admin/settings', icon: '⚙️', label: 'Settings', hint: 'Term start date' },
              { to: '/hod/dashboard', icon: '📊', label: 'Department overview', hint: 'Reports and attendance' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
