import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Card, Stat } from '../../components/ui';

export default function ExamEligibility() {
  const state = useFetch('/student/eligibility');
  return (
    <Page title="Exam eligibility" subtitle="Students need at least 75% attendance to sit exams">
      <Async state={state}>
        {(d) => (
          <>
            <Card className={d.isEligible ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}>
              <p className={`text-lg font-black ${d.isEligible ? 'text-emerald-700' : 'text-rose-700'}`}>{d.isEligible ? '✓ You are eligible for exams' : '✕ You are not eligible yet'}</p>
              <p className="text-sm text-gray-700 mt-1">{d.reason}</p>
              <div className="mt-3 h-2.5 bg-white rounded-full overflow-hidden border border-gray-200">
                <div className={`h-full ${d.isEligible ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, d.attendancePct)}%` }} />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{d.attendancePct.toFixed(1)}% attended · {d.threshold}% required</p>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Sessions held" value={d.sessionsHeld} />
              <Stat label="Sessions attended" value={d.sessionsAttended} tone="blue" />
            </div>
          </>
        )}
      </Async>
    </Page>
  );
}
