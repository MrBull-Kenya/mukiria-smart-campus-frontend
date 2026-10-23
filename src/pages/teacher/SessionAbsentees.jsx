import React, { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Card, Notice, Stat } from '../../components/ui';

export default function SessionAbsentees() {
  const sessions = useFetch('/teacher/sessions');
  const [selectedId, setSelectedId] = useState('');
  const absent = useFetch(
    selectedId ? `/teacher/sessions/${selectedId}/absent` : '/teacher/sessions',
    { enabled: !!selectedId }
  );

  useEffect(() => {
    if (!sessions.data) return;
    const stillAvailable = sessions.data.some((session) => String(session.id) === selectedId);
    if (!stillAvailable) setSelectedId(sessions.data[0] ? String(sessions.data[0].id) : '');
  }, [sessions.data, selectedId]);

  return (
    <Page title="Absent trainees" subtitle="Review trainees who did not attend a particular lesson">
      <Async state={sessions}>
        {(rows) => rows.length === 0 ? (
          <Notice kind="info">No lessons are recorded under your name yet. Class reps pick the lecturer when they start a session.</Notice>
        ) : (
          <>
            <label className="block max-w-xl">
              <span className="mb-1 block text-xs font-bold text-gray-700">Select lesson</span>
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              >
                {rows.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.date} · {session.time} · {session.unit} · {session.classCode}
                  </option>
                ))}
              </select>
            </label>
            <Async state={absent}>
              {(data) => (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Present" value={`${data.present} / ${data.total}`} tone="green" hint={`${data.session.unit} · ${data.session.classCode}`} />
                    <Stat label="Absent" value={data.absent.length} tone={data.absent.length ? 'red' : 'green'} hint={`${data.session.date} · ${data.session.time}`} />
                  </div>
                  {data.absent.length === 0 ? (
                    <Notice kind="ok">All trainees on the register attended this lesson.</Notice>
                  ) : (
                    <Card>
                      <h2 className="mb-2 text-sm font-black text-gray-900">Absent trainees</h2>
                      <div className="divide-y divide-gray-100">
                        {data.absent.map((trainee) => (
                          <div key={trainee.adm} className="flex items-center justify-between gap-3 py-3">
                            <span className="text-sm font-bold text-gray-900">{trainee.name}</span>
                            <span className="text-xs text-gray-500">{trainee.adm}</span>
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
