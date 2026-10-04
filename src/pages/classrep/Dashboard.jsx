import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid, Notice } from '../../components/ui';

export default function RepDashboard() {
  const state = useFetch('/classrep/dashboard', { pollMs: 15000 });
  return (
    <Page title="Class rep dashboard" subtitle={state.data?.className}>
      <Async state={state}>
        {(d) => (
          <>
            {d.activeSession
              ? <Notice kind="ok">Session in progress: <strong>{d.activeSession.unit}</strong>. <Link to="/rep/generate-qr" className="underline font-bold">Show QR</Link></Notice>
              : <Notice kind="info">No active session. <Link to="/rep/generate-qr" className="underline font-bold">Start one</Link> when the lecturer arrives.</Notice>}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Students" value={d.totalStudents} />
              <Stat label="Present today" value={d.presentToday} tone="green" />
              <Stat label="Late today" value={d.lateToday} tone="amber" />
              <Stat label="Absent today" value={d.absentToday} tone="red" />
              <Stat label="At risk (<75%)" value={d.atRiskCount} tone="red" />
            </div>
            <LinkGrid Link={Link} items={[
              { to: '/rep/generate-qr', icon: '📱', label: 'Attendance QR' },
              { to: '/rep/live-attendance', icon: '📡', label: 'Live attendance' },
              { to: '/rep/members', icon: '👥', label: 'Class members' },
              { to: '/rep/timetable', icon: '🗓️', label: 'Timetable' },
              { to: '/rep/temp-ids', icon: '🪪', label: 'Temporary IDs' },
              { to: '/rep/parent-alerts', icon: '📨', label: 'Parent alerts' },
              { to: '/rep/leaderboard', icon: '🏆', label: 'Leaderboard' },
              { to: '/rep/chat', icon: '📢', label: 'Announcements' },
              { to: '/rep/ministry-export', icon: '📄', label: 'Export report' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
