import React from 'react';
import { Badge, Card, ProgressBar } from '../ui';

export default function TopicAbsenteeism({ units = [] }) {
  if (!units.length) {
    return (
      <Card className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-700">No attendance data to display yet.</p>
        <p className="mt-1 text-xs text-slate-500">Unit analytics will appear after a session has been recorded.</p>
      </Card>
    );
  }

  return (
    <section aria-labelledby="topic-absenteeism-heading" className="space-y-4">
      <header>
        <h2 id="topic-absenteeism-heading" className="text-base font-extrabold tracking-tight text-blue-800">Absenteeism by unit</h2>
        <p className="mt-1 text-xs text-slate-500">Calculated from recorded attendance across your sessions.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {units.map((unit) => {
          const attendance = Math.min(100, Math.max(0, Number(unit.averageAttendance) || 0));
          const absence = 100 - attendance;
          const tone = absence > 25 ? 'red' : absence > 15 ? 'amber' : 'blue';

          return (
            <Card key={`${unit.classCode}-${unit.unit}`} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-bold text-slate-900">{unit.unit}</h3>
                  <p className="mt-1 text-xs text-slate-500">{unit.sessions} {unit.sessions === 1 ? 'session' : 'sessions'} · {unit.enrolled} enrolled</p>
                </div>
                <Badge tone="blue">{unit.classCode}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-blue-50/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Average attendance</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-blue-700">{attendance.toFixed(1)}%</p>
                </div>
                <div className={`rounded-xl p-3 ${tone === 'red' ? 'bg-rose-50' : tone === 'amber' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Average absent</p>
                  <p className={`mt-1 text-lg font-extrabold tabular-nums ${tone === 'red' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-800'}`}>{absence.toFixed(1)}%</p>
                </div>
              </div>

              <ProgressBar value={absence} tone={tone} ariaLabel={`${unit.unit}, ${unit.classCode} absenteeism rate`} />

              {unit.atRiskStudents.length === 0 ? (
                <p className="border-t border-slate-100 pt-3 text-xs font-semibold text-emerald-700">No students are currently below the attendance threshold.</p>
              ) : (
                <details className="border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                    {unit.atRiskStudents.length} at-risk {unit.atRiskStudents.length === 1 ? 'student' : 'students'}
                  </summary>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {unit.atRiskStudents.map((student) => (
                      <li key={student.adm} className="flex items-center justify-between gap-3 py-2 text-xs">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-slate-800">{student.name}</span>
                          <span className="text-slate-500">{student.adm}</span>
                        </span>
                        <span className="shrink-0 font-bold tabular-nums text-rose-700">{Number(student.attendance).toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500">Absenteeism is calculated as 100% minus average attendance for each unit and class.</p>
    </section>
  );
}
