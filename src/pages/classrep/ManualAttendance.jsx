import React, { useMemo, useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Badge, Btn, Card, Notice, Stat } from '../../components/ui';

export default function ManualAttendance() {
  const state = useFetch('/classrep/manual-attendance', { pollMs: 10000 });
  const [search, setSearch] = useState('');
  const [busyAdm, setBusyAdm] = useState('');
  const [msg, setMsg] = useState(null);
  const students = state.data?.students || [];
  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? students.filter((student) => `${student.name} ${student.adm}`.toLowerCase().includes(term)) : students;
  }, [students, search]);

  const markPresent = async (student) => {
    if (!window.confirm(`Confirm that ${student.name} (${student.adm}) is physically present in class now.`)) return;
    setBusyAdm(student.adm);
    setMsg(null);
    try {
      const { data } = await api.post('/classrep/manual-attendance', { adm_no: student.adm });
      setMsg({ kind: 'ok', text: data.message });
      await state.reload(true);
    } catch (err) {
      setMsg({ kind: 'error', text: getErrorMessage(err, 'Could not record attendance.') });
      await state.reload(true);
    } finally {
      setBusyAdm('');
    }
  };

  return (
    <Page title="Mark present" subtitle="For students without a phone: verify they are in class before recording attendance">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(data) => !data.session ? (
          <Notice kind="warn">There is no active class session. Start one from <a href="/rep/generate-qr" className="font-bold underline">Show QR</a> before marking attendance.</Notice>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Active session" value={data.session.unit} hint={`Started ${data.session.startedAt}`} tone="blue" />
              <Stat label="Present" value={`${students.filter((student) => student.present).length} / ${students.length}`} hint="Includes QR and rep-marked check-ins" tone="green" />
            </div>
            <Notice kind="info">Only mark a student after confirming they are physically present. Each student can be recorded once per active session. Manual check-ins are attributed to your rep account.</Notice>
            <Card className="space-y-3">
              <label className="block">
                <span className="block text-xs font-bold text-gray-700 mb-1">Find a student</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or admission number" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              </label>
              {visibleStudents.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">{students.length ? 'No students match your search.' : 'No active students are registered in this class.'}</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleStudents.map((student) => (
                    <div key={student.adm} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.adm}</p>
                      </div>
                      {student.present ? (
                        <span className="flex items-center gap-2">
                          <Badge tone={student.late ? 'amber' : 'green'}>{student.late ? 'Present · Late' : 'Present'}</Badge>
                          <span className="text-xs text-gray-500">{student.time}{student.method === 'manual' ? ' · rep-marked' : ''}</span>
                        </span>
                      ) : (
                        <Btn type="button" disabled={!!busyAdm} onClick={() => markPresent(student)}>
                          {busyAdm === student.adm ? 'Recording…' : 'Mark present'}
                        </Btn>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </Async>
    </Page>
  );
}
