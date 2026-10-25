import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import FileActions, { fmtSize } from '../../components/FileActions';
import { Page, Async, Table, Badge, Card, Notice } from '../../components/ui';
import LiveSessionCard from '../../components/LiveSessionCard';
import { dayKey, formatDuration, minutesOf, slotTiming, WEEKDAYS } from '../../utils/timetable';

function LiveSchedule({ slots, now, selectedDay, onSelectDay }) {
  const today = dayKey(now);
  const isToday = selectedDay === today;
  const day = WEEKDAYS.find((weekday) => weekday.key === selectedDay)?.key || today;
  const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const daySlots = slots.filter((slot) => String(slot.day || '').toLowerCase() === day);
  const liveIndex = isToday ? daySlots.findIndex((slot) => slotTiming(slot, nowMinutes).status === 'live') : -1;
  const nextIndex = isToday ? daySlots.findIndex((slot) => slotTiming(slot, nowMinutes).status === 'upcoming') : -1;
  const liveTiming = liveIndex >= 0 ? slotTiming(daySlots[liveIndex], nowMinutes) : null;
  const nextTiming = nextIndex >= 0 ? slotTiming(daySlots[nextIndex], nowMinutes) : null;
  const completedCount = isToday ? daySlots.filter((slot) => slotTiming(slot, nowMinutes).status === 'completed').length : 0;

  return (
    <section aria-label={`Timetable for ${dayLabel}`} className="space-y-4">
      <div role="group" aria-label="Choose a day" className="grid grid-cols-7 gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:gap-2 sm:p-3">
        {WEEKDAYS.map((weekday) => {
          const count = slots.filter((slot) => String(slot.day || '').toLowerCase() === weekday.key).length;
          const isActive = selectedDay === weekday.key;
          const isCurrent = today === weekday.key;
          return (
            <button key={weekday.key} type="button" aria-pressed={isActive} aria-label={`${weekday.key}${isCurrent ? ', today' : ''}, ${count} lessons`}
              onClick={() => onSelectDay(weekday.key)}
              className={`min-w-0 rounded-xl px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:px-2 ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'}`}>
              <span className="block text-[10px] font-bold sm:text-xs">{weekday.label}</span>
              <span className={`mt-1 block text-[10px] font-semibold tabular-nums ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{count || '—'}</span>
              {isCurrent && <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${isActive ? 'bg-white' : 'bg-blue-500'}`} />}
            </button>
          );
        })}
      </div>

      {isToday ? (
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Today</p>
          <p className="mt-1 text-lg font-extrabold text-blue-800">{daySlots.length}</p>
          <p className="text-[10px] text-slate-500">lessons</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Completed</p>
          <p className="mt-1 text-lg font-extrabold text-emerald-700">{completedCount}</p>
          <p className="text-[10px] text-slate-500">lessons</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{liveIndex >= 0 ? 'In progress' : 'Up next'}</p>
          <p className={`mt-1 truncate text-sm font-extrabold ${liveIndex >= 0 ? 'text-emerald-700' : 'text-amber-600'}`}>
            {liveIndex >= 0 ? daySlots[liveIndex].unit : nextIndex >= 0 ? daySlots[nextIndex].unit : '—'}
          </p>
          <p className="text-[10px] text-slate-500">
            {liveIndex >= 0 && liveTiming
              ? `Ends in ${formatDuration(Math.max(0, minutesOf(daySlots[liveIndex].time.split('-')[1]?.trim()) - nowMinutes))}`
              : nextIndex >= 0 && nextTiming
                ? `Starts in ${formatDuration(Math.max(0, minutesOf(daySlots[nextIndex].time.split('-')[0]?.trim()) - nowMinutes))}`
                : 'No more lessons'}
          </p>
        </Card>
      </div>
      ) : (
        <Card className="flex items-center justify-between gap-3 bg-blue-50/60">
          <div>
            <p className="text-sm font-extrabold text-blue-900">{dayLabel}'s schedule</p>
            <p className="text-xs text-slate-600">{daySlots.length} {daySlots.length === 1 ? 'lesson' : 'lessons'} planned</p>
          </div>
          <button type="button" onClick={() => onSelectDay(today)} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            Back to today
          </button>
        </Card>
      )}

      {!daySlots.length ? (
        <Notice kind="info">There are no lessons scheduled for {dayLabel}. Choose another day to explore the weekly schedule.</Notice>
      ) : (
      <div className="space-y-3">
        {daySlots.map((slot, index) => {
          const timing = isToday ? slotTiming(slot, nowMinutes) : { status: 'scheduled', progress: 0 };
          const isLive = isToday && timing.status === 'live';
          const isNext = index === nextIndex;
          const tone = isLive ? 'green' : isNext ? 'amber' : timing.status === 'completed' ? 'gray' : 'blue';
          const label = isLive ? 'Happening now' : isNext ? 'Up next' : timing.status === 'completed' ? 'Completed' : isToday ? 'Upcoming' : 'Scheduled';

          return (
            <article key={slot.id || `${slot.time}-${slot.unit}-${index}`} className={`relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm ${isLive ? 'border-emerald-300 ring-2 ring-emerald-100' : isNext ? 'border-amber-200' : 'border-slate-200'}`}>
              {isLive && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-900">{slot.unit || 'Lesson'}</p>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <p className="mt-1 text-xs font-semibold tabular-nums text-blue-800">{slot.time}</p>
                </div>
                {slot.venue && <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{slot.venue}</span>}
              </div>
              {slot.lecturer && <p className="mt-2 text-xs text-slate-500">Trainer: {slot.lecturer}</p>}
              {isLive && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px] font-semibold text-emerald-800">
                    <span>Lesson in progress</span><span>{timing.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100" role="progressbar" aria-label={`${slot.unit} lesson progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={timing.progress}>
                    <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${timing.progress}%` }} />
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      )}
    </section>
  );
}

function WeekSchedule({ slots, today, selectedDay, onSelectDay }) {
  const days = [{ key: 'all', label: 'All days' }, ...WEEKDAYS.map(({ key, label }) => ({ key, label }))];
  const daySlots = selectedDay === 'all'
    ? slots
    : slots.filter((slot) => String(slot.day || '').toLowerCase() === selectedDay);
  const selectedLabel = selectedDay === 'all'
    ? 'All lessons'
    : WEEKDAYS.find((weekday) => weekday.key === selectedDay)?.key;
  const title = selectedLabel ? selectedLabel.charAt(0).toUpperCase() + selectedLabel.slice(1) : 'Timetable';

  return (
    <section aria-label="Weekly timetable" className="space-y-4">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div role="group" aria-label="Filter timetable by day" className="flex min-w-max gap-2">
          {days.map((day) => {
            const count = day.key === 'all'
              ? slots.length
              : slots.filter((slot) => String(slot.day || '').toLowerCase() === day.key).length;
            const isActive = selectedDay === day.key;
            const isToday = today === day.key;
            return (
              <button key={day.key} type="button" aria-pressed={isActive} onClick={() => onSelectDay(day.key)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${isActive ? 'border-blue-700 bg-blue-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}>
                <span>{day.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${isActive ? 'bg-white/15 text-blue-50' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                {isToday && <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-blue-600'}`} aria-label="Today" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            {daySlots.length} {daySlots.length === 1 ? 'lesson' : 'lessons'}
            {selectedDay === today && selectedDay !== 'all' ? ' scheduled for today' : ' in this view'}
          </p>
        </div>
        {selectedDay !== 'all' && selectedDay !== today && (
          <button type="button" onClick={() => onSelectDay('all')} className="rounded-lg px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            Show full week
          </button>
        )}
      </div>

      {daySlots.length ? (
        <Table rows={daySlots} searchable columns={[
          { key: 'day', label: 'Day' },
          { key: 'time', label: 'Time' },
          { key: 'unit', label: 'Unit' },
          { key: 'venue', label: 'Venue' },
          { key: 'lecturer', label: 'Lecturer' },
        ]} />
      ) : (
        <Notice kind="info">There are no lessons scheduled for {title}. Choose another day to explore the timetable.</Notice>
      )}
    </section>
  );
}

export default function Timetable() {
  const state = useFetch('/student/timetable', { pollMs: 10000 });
  const [now, setNow] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState('live');
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState('all');
  const today = dayKey(now);
  const activeDay = selectedDay || today;
  const previousDay = useRef(today);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (previousDay.current !== today) {
      previousDay.current = today;
      setSelectedDay(null);
    }
  }, [today]);

  const todayLabel = useMemo(() => now.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }), [now]);

  return (
    <Page title="Class timetable" subtitle="Your approved schedule, with a live view of today's lessons">
      <Async state={state}>
        {(data) => (
          <>
            <LiveSessionCard session={data.liveSession} />
            {!data.version ? <Notice kind="info">There is no approved timetable for your class yet.</Notice> : (
            <>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900">{data.version.term || 'Approved timetable'}</h2>
                  <Badge tone="green">Approved</Badge>
                  <span className="text-xs text-slate-500">Updated {data.version.uploaded}</span>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  Live · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {data.version.comment && <p className="text-xs text-slate-600">HOD comment: {data.version.comment}</p>}
              {data.version.file && (
                <p className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <span>📎 <strong>{data.version.file.name}</strong> <span className="text-xs text-slate-400">({fmtSize(data.version.file.size)})</span></span>
                  <FileActions url={`/student/timetable/${data.version.id}/file`} file={data.version.file} />
                </p>
              )}
            </Card>

            <div role="group" aria-label="Timetable views" className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1.5">
              <button type="button" aria-pressed={activeTab === 'live'} onClick={() => setActiveTab('live')}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${activeTab === 'live' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-blue-800'}`}>
                <span className={`h-2 w-2 rounded-full ${activeTab === 'live' ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
                <span className="text-left">
                  <span className="block">Live today</span>
                  <span className={`block text-[10px] font-medium ${activeTab === 'live' ? 'text-slate-500' : 'text-slate-400'}`}>{todayLabel}</span>
                </span>
              </button>
              <button type="button" aria-pressed={activeTab === 'week'} onClick={() => setActiveTab('week')}
                className={`flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${activeTab === 'week' ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-blue-800'}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-black text-blue-800" aria-hidden="true">7D</span>
                <span className="text-left">
                  <span className="block">Weekly schedule</span>
                  <span className={`block text-[10px] font-medium ${activeTab === 'week' ? 'text-slate-500' : 'text-slate-400'}`}>{data.slots.length} scheduled {data.slots.length === 1 ? 'lesson' : 'lessons'}</span>
                </span>
              </button>
            </div>

            {activeTab === 'live' ? (
              <div id="timetable-live-panel" aria-label="Live timetable" className="space-y-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{todayLabel}</h3>
                  <p className="text-xs text-slate-500">Updates automatically as lessons begin and finish.</p>
                </div>
                {data.slots.length > 0
                  ? <LiveSchedule slots={data.slots} now={now} selectedDay={activeDay} onSelectDay={(day) => setSelectedDay(day === today ? null : day)} />
                  : <Notice kind="info">No lesson times are available in this timetable. Open the full timetable or attached file for details.</Notice>}
              </div>
            ) : (
              <div id="timetable-week-panel">
                {data.slots.length > 0
                  ? <WeekSchedule slots={data.slots} today={today} selectedDay={selectedWeekDay} onSelectDay={setSelectedWeekDay} />
                  : <Notice kind="info">
                    {data.version.file
                      ? 'This timetable is available as an attached file rather than a lesson table. Open or download the file above.'
                      : 'This approved timetable has no lesson times or attached file yet.'}
                  </Notice>}
              </div>
            )}
            </>
            )}
          </>
        )}
      </Async>
    </Page>
  );
}
