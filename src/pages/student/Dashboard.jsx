import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Badge, Card, Stat, LinkGrid, Notice } from '../../components/ui';
import { dayKey, formatDuration, minutesOf, slotTiming } from '../../utils/timetable';

function TodaySchedule() {
  const state = useFetch('/student/timetable', { pollMs: 60000 });
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const today = dayKey(now);
  const todayLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (state.error) {
    return (
      <Card className="space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Today's timetable</h2>
          <p className="mt-1 text-xs text-slate-500">{todayLabel}</p>
        </div>
        <Notice kind="error">{state.error}</Notice>
        <button type="button" onClick={() => state.reload()} className="rounded-lg px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          Retry timetable
        </button>
      </Card>
    );
  }

  if (!state.data) {
    return (
      <Card className="animate-pulse">
        <div role="status" aria-label="Loading today's timetable">
          <div className="h-4 w-40 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-28 rounded bg-slate-100" />
          <div className="mt-5 h-16 rounded-xl bg-slate-50" />
        </div>
      </Card>
    );
  }

  const { version, slots = [] } = state.data;
  const lessons = version ? slots.filter((slot) => String(slot.day || '').toLowerCase() === today) : [];
  const timedLessons = lessons.map((slot) => ({ ...slot, timing: slotTiming(slot, nowMinutes) }));
  const liveIndex = timedLessons.findIndex((slot) => slot.timing.status === 'live');
  const nextIndex = timedLessons.findIndex((slot) => slot.timing.status === 'upcoming');
  const completedCount = timedLessons.filter((slot) => slot.timing.status === 'completed').length;
  const highlightIndex = liveIndex >= 0 ? liveIndex : nextIndex;
  const highlight = highlightIndex >= 0 ? timedLessons[highlightIndex] : null;
  const highlightLabel = liveIndex >= 0 ? 'In progress' : 'Up next';
  const highlightTone = liveIndex >= 0 ? 'green' : 'amber';
  const relevantTime = highlight?.time?.split('-')[liveIndex >= 0 ? 1 : 0]?.trim();
  const remaining = relevantTime ? minutesOf(relevantTime) - nowMinutes : null;
  const statusTone = { live: 'green', upcoming: 'amber', completed: 'gray', scheduled: 'blue' };
  const statusLabel = (slot, index) => slot.timing.status === 'live'
    ? 'In progress'
    : slot.timing.status === 'completed'
      ? 'Completed'
      : slot.timing.status === 'upcoming' && index === nextIndex
        ? 'Up next'
        : slot.timing.status === 'upcoming'
          ? 'Upcoming'
          : 'Scheduled';

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Today's timetable</h2>
          <p className="mt-1 text-xs text-slate-500">{todayLabel}{version ? ` · ${version.term || 'Approved schedule'}` : ''}</p>
        </div>
        <Link to="/student/timetable" className="rounded-lg px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
          Full timetable
        </Link>
      </div>

      {!version ? (
        <Notice kind="info">There is no approved timetable for your class yet.</Notice>
      ) : !lessons.length ? (
        <Notice kind="info">No lessons are scheduled for today. You can view the full week in your timetable.</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {highlight ? highlightLabel : completedCount === lessons.length ? 'Schedule complete' : 'No more lessons'}
                </p>
                {highlight && <Badge tone={highlightTone}>{highlightLabel}</Badge>}
              </div>
              <p className="mt-1 truncate text-base font-extrabold text-slate-900">
                {highlight?.unit || 'Enjoy the rest of your day'}
              </p>
              {highlight && (
                <p className="mt-1 text-xs text-slate-600">
                  {highlight.time}{highlight.venue ? ` · ${highlight.venue}` : ''}
                  {highlight.lecturer ? ` · ${highlight.lecturer}` : ''}
                </p>
              )}
            </div>
            {highlight && Number.isFinite(remaining) && (
              <p className="shrink-0 text-xs font-semibold text-blue-800">
                {liveIndex >= 0 ? 'Ends' : 'Starts'} {formatDuration(Math.max(0, remaining))}
              </p>
            )}
          </div>

          <div className="space-y-2" aria-label="Today's lessons">
            {timedLessons.map((slot, index) => (
              <div key={slot.id || `${slot.time}-${slot.unit}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                <span className="w-24 shrink-0 text-[11px] font-semibold tabular-nums text-blue-800">{slot.time}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800">{slot.unit || 'Lesson'}</span>
                <Badge tone={statusTone[slot.timing.status]}>{statusLabel(slot, index)}</Badge>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">Lesson status is estimated from your approved timetable.</p>
        </>
      )}
    </Card>
  );
}

export default function StudentDashboard() {
  const state = useFetch('/student/dashboard');
  return (
    <Page title={state.data ? `Hello, ${state.data.name.split(' ')[0]}` : 'Dashboard'} subtitle={state.data ? `${state.data.adm} · ${state.data.classCode}` : ''}>
      <Async state={state}>
        {(d) => (
          <>
            <section aria-label="Your progress" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Attendance" value={`${d.attendancePercentage.toFixed(1)}%`} tone={d.attendancePercentage >= 75 ? 'green' : 'red'} hint={d.attendancePercentage >= 75 ? 'Exam eligibility threshold met' : 'Below the 75% exam eligibility minimum'} progress={d.attendancePercentage} />
              <Stat label="Points" value={d.points} tone="blue" />
              <Stat label="Class rank" value={d.rank} />
              <Stat label="Attendance streak" value={d.streak} hint="Consecutive sessions" />
            </section>
            <TodaySchedule />
            <LinkGrid Link={Link} items={[
              { to: '/scan', icon: 'scan', label: 'Scan attendance', hint: 'Check in using your session QR code and location', primary: true },
              { to: '/student/history', icon: 'history', label: 'Attendance history' },
              { to: '/student/exam-eligibility', icon: 'graduation', label: 'Exam eligibility' },
              { to: '/student/digital-id', icon: 'users', label: 'Digital ID' },
              { to: '/student/request-temp-id', icon: 'support', label: 'Request temporary ID' },
              { to: '/student/rank', icon: 'trophy', label: 'Class leaderboard' },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
