import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Card, Badge, Notice } from '../../components/ui';

export default function MySubjectsAbsenteeism() {
  const state = useFetch('/teacher/absenteeism');
  return (
    <Page title="Absenteeism by unit" subtitle="Students attending fewer than 75% of your sessions">
      <Async state={state}>
        {(units) => units.length === 0 ? <Notice kind="info">No sessions recorded under your name yet.</Notice> : (
          <div className="grid md:grid-cols-2 gap-4">
            {units.map((u) => (
              <Card key={`${u.classCode}${u.unit}`} className="space-y-2">
                <div className="flex justify-between"><p className="font-bold text-gray-900">{u.unit}</p><Badge tone="blue">{u.classCode}</Badge></div>
                <p className="text-xs text-gray-500">{u.sessions} session(s) · {u.enrolled} students · average attendance <strong>{u.averageAttendance}%</strong></p>
                {u.atRiskStudents.length === 0 ? <p className="text-xs text-emerald-600 font-bold">No at-risk students 🎉</p> : (
                  <ul className="text-xs divide-y divide-gray-100">
                    {u.atRiskStudents.map((s) => <li key={s.adm} className="py-1 flex justify-between"><span>{s.name} <span className="text-gray-400">({s.adm})</span></span><span className="font-bold text-rose-600">{s.attendance}%</span></li>)}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </Async>
    </Page>
  );
}
