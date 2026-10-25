import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Badge, Btn, Card, Notice, Stat } from '../../components/ui';

export default function SignAttendance() {
  const state = useFetch('/teacher/sessions', { pollMs: 15000 });
  const [msg, setMsg] = useState(null);
  const [busyId, setBusyId] = useState('');
  const sign = async (id) => {
    if (!window.confirm('Confirm that you reviewed and approve this lesson attendance register? Signing closes the session.')) return;
    setBusyId(String(id));
    setMsg(null);
    try {
      const res = await api.post(`/teacher/sessions/${id}/sign`);
      setMsg({ kind: 'ok', text: res.data.message });
      await state.reload(true);
    } catch (err) {
      setMsg({ kind: 'error', text: getErrorMessage(err) });
    } finally {
      setBusyId('');
    }
  };
  return (
    <Page title="Sign attendance" subtitle="Review each lesson register before signing. A sign-off closes that lesson session.">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => !rows.length ? (
          <Notice kind="info">No lessons are recorded under your name yet. Class reps choose the lecturer when they start a session.</Notice>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Stat label="Lessons" value={rows.length} />
              <Stat label="Awaiting sign-off" value={rows.filter((row) => !row.signed).length} tone={rows.some((row) => !row.signed) ? 'amber' : 'green'} />
              <Stat label="Signed" value={rows.filter((row) => row.signed).length} tone="green" />
            </div>
            {rows.map((row) => (
              <Card key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900">{row.unit}</h2>
                    <Badge tone={row.active ? 'blue' : row.signed ? 'green' : 'amber'}>{row.active ? 'In progress' : row.signed ? 'Signed' : 'Ready to review'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{row.classCode} · {row.date} · {row.time}{row.stopTime ? `–${row.stopTime}` : ''}</p>
                  <p className="mt-1 text-xs text-slate-500">Class rep: {row.rep}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">Present</p>
                    <p className="text-sm tabular-nums text-slate-600">{row.present} / {row.total}</p>
                  </div>
                  {row.signed ? (
                    <Badge tone="green">Signed</Badge>
                  ) : (
                    <Btn variant="ok" disabled={!!busyId || row.active} onClick={() => sign(row.id)}>
                      {busyId === String(row.id) ? 'Signing…' : row.active ? 'End session first' : 'Review & sign'}
                    </Btn>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Async>
    </Page>
  );
}
