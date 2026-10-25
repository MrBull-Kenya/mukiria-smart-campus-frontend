import React, { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Badge, Card, Notice, Stat } from '../../components/ui';

export default function PresentTrainees() {
  const sessions = useFetch('/teacher/sessions', { pollMs: 15000 });
  const [selectedId, setSelectedId] = useState('');
  const attendance = useFetch(
    selectedId ? `/teacher/sessions/${selectedId}/present` : '/teacher/sessions',
    { enabled: !!selectedId, pollMs: 8000 }
  );

  useEffect(() => {
    if (!sessions.data) return;
    if (!sessions.data.some((session) => String(session.id) === selectedId)) {
      setSelectedId(sessions.data[0] ? String(sessions.data[0].id) : '');
    }
  }, [sessions.data, selectedId]);

  return (
    <Page title="Present trainees" subtitle="View the attendance recorded for each of your lessons">
      <Async state={sessions}>
        {(rows) => !rows.length ? (
          <Notice kind="info">No lessons are recorded under your name yet. Class reps select the lecturer when they start a session.</Notice>
        ) : (
          <>
            <Card className="space-y-3">
              <label className="block max-w-2xl">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Select lesson</span>
                <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="w-full px-3 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
                  {rows.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.date} · {session.time}{session.stopTime ? `–${session.stopTime}` : ''} · {session.unit} · {session.classCode}
                    </option>
                  ))}
                </select>
              </label>
            </Card>
            <Async state={attendance}>
              {(data) => (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <Stat label="Present" value={`${data.present} / ${data.total}`} tone="green" hint={`${data.session.unit} · ${data.session.classCode}`} progress={data.total ? (data.present / data.total) * 100 : 0} />
                    <Stat label="On time" value={data.students.filter((student) => !student.late).length} tone="blue" />
                    <Stat label="Late" value={data.students.filter((student) => student.late).length} tone="amber" hint={`${data.session.date} · ${data.session.time}`} />
                  </div>
                  {data.session.active && <Notice kind="info">This lesson is still active. The attendance list refreshes automatically.</Notice>}
                  {!data.students.length ? (
                    <Notice kind="info">No trainees have checked in for this lesson yet.</Notice>
                  ) : (
                    <Card className="overflow-hidden p-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                        <div>
                          <h2 className="text-sm font-extrabold text-slate-900">Attendance register</h2>
                          <p className="mt-1 text-xs text-slate-500">{data.session.date} · {data.session.time}{data.session.stopTime ? `–${data.session.stopTime}` : ''}</p>
                        </div>
                        <Badge tone={data.session.active ? 'green' : 'gray'}>{data.session.active ? 'Live' : 'Session ended'}</Badge>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {data.students.map((student) => (
                          <div key={student.adm} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{student.name}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{student.adm} · Checked in {student.time}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={student.late ? 'amber' : 'green'}>{student.late ? 'Late' : 'On time'}</Badge>
                              <span className="text-[11px] text-slate-500">{student.method === 'manual' ? 'Rep marked' : 'QR scan'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              )}
            </Async>
          </>
        )}
      </Async>
    </Page>
  );
}
