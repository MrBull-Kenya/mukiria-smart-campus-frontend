import React from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, LinkGrid } from '../../components/ui';

export default function StudentDashboard() {
  const state = useFetch('/student/dashboard');
  return (
    <Page title={state.data ? `Hello, ${state.data.name.split(' ')[0]}` : 'Dashboard'} subtitle={state.data ? `${state.data.adm} · ${state.data.classCode}` : ''}>
      <Async state={state}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Attendance" value={`${d.attendancePercentage.toFixed(1)}%`} tone={d.attendancePercentage >= 75 ? 'green' : 'red'} hint={d.attendancePercentage >= 75 ? 'Exam eligible' : 'Below 75% minimum'} />
              <Stat label="Points" value={d.points} tone="blue" />
              <Stat label="Class rank" value={d.rank} />
              <Stat label="Streak" value={`${d.streak} 🔥`} hint="Sessions in a row" />
            </div>
            <LinkGrid Link={Link} items={[
              { to: '/scan', icon: '📷', label: 'Scan attendance', hint: 'QR + selfie + GPS' },
              { to: '/student/history', icon: '🗓️', label: 'My history' },
              { to: '/student/exam-eligibility', icon: '🎓', label: 'Exam eligibility' },
              { to: '/student/digital-id', icon: '🪪', label: 'Digital ID' },
              { to: '/student/request-temp-id', icon: '🆘', label: 'Lost my ID' },
              { to: '/student/rank', icon: '🏆', label: 'My rank' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
