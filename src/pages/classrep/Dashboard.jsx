import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid, Notice } from '../../components/ui';

export default function RepDashboard() {
  const state = useFetch('/classrep/dashboard', { pollMs: 15000 });
  const day = new Date().getDay();
  const endOfWeek = day === 5 || day === 6 || day === 0; // Friday to Sunday: time to print the week's sheet
  return (
    <Page title="Class rep dashboard" subtitle={state.data?.className}>
      <Async state={state}>
        {(d) => (
          <>
            {endOfWeek && <Notice kind="warn">The week is ending. <Link to="/rep/weekly-sheet" className="font-bold underline underline-offset-2">Download this week's attendance sheet</Link> and print it for signing.</Notice>}
            {d.activeSession
              ? <Notice kind="ok">Session in progress: <strong>{d.activeSession.unit}</strong>. <Link to="/rep/generate-qr" className="underline font-bold">Show QR</Link></Notice>
              : <Notice kind="info">No active session. <Link to="/rep/generate-qr" className="underline font-bold">Start one</Link> when the lecturer arrives.</Notice>}
            <section aria-label="Today's attendance summary" className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Students" value={d.totalStudents} />
              <Stat label="Present today" value={d.presentToday} tone="green" />
              <Stat label="Late today" value={d.lateToday} tone="amber" />
              <Stat label="Absent today" value={d.absentToday} tone="red" />
              <Stat label="At risk (<75%)" value={d.atRiskCount} tone="red" />
            </section>
            <LinkGrid Link={Link} items={[
              { to: '/rep/generate-qr', icon: 'qr', label: 'Attendance QR', hint: 'Start or display the active session QR', primary: true },
              { to: '/rep/live-attendance', icon: 'radio', label: 'Live attendance' },
              { to: '/rep/members', icon: 'users', label: 'Class members' },
              { to: '/rep/timetable', icon: 'calendar', label: 'Timetable' },
              { to: '/rep/temp-ids', icon: 'id', label: 'Temporary IDs' },
              { to: '/rep/parent-alerts', icon: 'mail', label: 'Parent alerts' },
              { to: '/rep/leaderboard', icon: 'trophy', label: 'Leaderboard' },
              { to: '/student/chat', icon: 'chat', label: 'Class chat' },
              { to: '/rep/chat', icon: 'megaphone', label: 'Announcements' },
              { to: '/rep/weekly-sheet', icon: 'printer', label: 'Weekly sheet', hint: 'Print the register for signing' },
              { to: '/rep/ministry-export', icon: 'file', label: 'Export report' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
