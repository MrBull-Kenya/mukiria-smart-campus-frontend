import React, { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import { downloadFile } from '../services/download';
import { Async, Stat, Card, Table, Btn, Notice, Badge } from './ui';

const MARKS = { P: { tone: 'green', text: 'P' }, L: { tone: 'amber', text: 'L' }, A: { tone: 'red', text: 'A' } };

// Weekly attendance sheet for one class: on-screen preview + printable PDF / CSV.
// basePath "/classrep" = the rep's own class; "/hod" = any class (pass classCode).
export default function WeeklySheet({ basePath, classCode = '' }) {
  const [week, setWeek] = useState(''); // '' = the current week
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  const params = new URLSearchParams();
  if (classCode) params.set('class_code', classCode);
  if (week) params.set('week', week);
  const qs = params.toString();
  const state = useFetch(`${basePath}/weekly-sheet${qs ? `?${qs}` : ''}`, { enabled: basePath !== '/hod' || !!classCode });

  const download = async (format) => {
    setBusy(format); setMsg(null);
    const p = new URLSearchParams(params); p.set('format', format);
    const d = state.data;
    const name = `weekly-attendance-${String(d?.classCode || classCode || 'class').replace(/\W+/g, '_')}-${d?.weekStart || 'week'}.${format}`;
    const r = await downloadFile(`${basePath}/weekly-sheet?${p}`, name);
    setMsg(r.ok ? { kind: 'ok', text: format === 'pdf' ? 'Register downloaded. Print it on A4 (landscape), then get the teacher to sign and the HOD to comment.' : 'CSV downloaded (opens in Excel).' } : { kind: 'error', text: r.message });
    setBusy('');
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-xs font-bold text-gray-700 mb-1">Week (pick any day in it)</span>
          <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm" />
        </label>
        <Btn variant="ghost" onClick={() => setWeek('')} disabled={!week}>This week</Btn>
        {state.data && <p className="text-sm text-gray-600 pb-2">Showing <strong>{state.data.weekLabel}</strong>{!week && ' (current week)'}</p>}
      </Card>

      <Async state={state}>
        {(d) => (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Students" value={d.totals.students} />
              <Stat label="Lessons held" value={d.totals.sessions} tone="blue" />
              <Stat label="Present this week" value={d.totals.presentStudents} tone="green" hint="Attended at least one lesson" />
              <Stat label="Perfect attendance" value={d.totals.perfect} tone="green" hint="Present at every lesson" />
            </div>

            <Card className="flex flex-wrap items-center gap-3">
              <Btn onClick={() => download('pdf')} disabled={!!busy || d.totals.sessions === 0}>{busy === 'pdf' ? 'Preparing…' : '⬇ Download register (PDF) to print'}</Btn>
              <Btn variant="ghost" onClick={() => download('csv')} disabled={!!busy || d.totals.sessions === 0}>{busy === 'csv' ? 'Preparing…' : '⬇ CSV (Excel)'}</Btn>
              <span className="text-xs text-gray-500">{d.classCode}{d.course ? ` · ${d.course}` : ''}</span>
            </Card>
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <Notice kind="info">The PDF is the official attendance register (form <strong>MTTI/REG/CUR/01</strong>), <strong>one page per subject</strong>: ✓ present, ✗ absent, blank where no lesson was held.</Notice>
            {d.totals.sessions > 0 && d.weekNumber == null && <Notice kind="warn">The <strong>WEEK</strong> number will be blank on the printout because no term start date is set. Ask the Administrator to set it (Admin &gt; Settings), or write it in by hand.</Notice>}
            {d.totals.sessions > 0 && !d.department && <Notice kind="warn">The <strong>DEPARTMENT</strong> will be blank because this class has none set. The Administrator can add it on the Classes page.</Notice>}
            {d.weekendSkipped > 0 && <Notice kind="info">{d.weekendSkipped} lesson(s) held on Saturday/Sunday are not on the register (it has Monday–Friday columns). They are in the CSV.</Notice>}

            {d.sessions.length === 0 ? <Notice kind="info">No lessons were held in this week.</Notice> : (
              <>
                <Card>
                  <p className="text-xs font-bold text-gray-700 mb-2">Lessons</p>
                  <ul className="text-xs space-y-1">
                    {d.sessions.map((s) => (
                      <li key={s.id} className="flex flex-wrap gap-2 items-center">
                        <span className="font-black text-gray-900">S{s.n}</span><span>{s.label}</span><span className="font-semibold">{s.unit}</span>
                        {s.lecturer && <span className="text-gray-500">({s.lecturer})</span>}
                        <Badge tone={s.signed ? 'green' : 'amber'}>{s.signed ? 'signed' : 'not signed'}</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Table rows={d.students} empty="No students in this class." columns={[
                  { key: 'name', label: 'Name' }, { key: 'adm', label: 'Adm no' },
                  ...d.sessions.map((s, i) => ({ key: `s${s.n}`, label: `S${s.n}`, render: (r) => <Badge tone={MARKS[r.marks[i]].tone}>{MARKS[r.marks[i]].text}</Badge> })),
                  { key: 'present', label: 'Present' }, { key: 'late', label: 'Late' }, { key: 'absent', label: 'Absent' },
                  { key: 'pct', label: 'Week %', render: (r) => `${r.pct}%` },
                ]} />
                <p className="text-[11px] text-gray-500">P = present · L = late · A = absent. "Present" counts on-time and late arrivals.</p>
              </>
            )}
          </>
        )}
      </Async>
    </div>
  );
}
