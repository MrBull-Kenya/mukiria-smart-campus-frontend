import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import WeeklySheet from '../../components/WeeklySheet';
import { Page, Async, Card } from '../../components/ui';

export default function HodWeeklySheets() {
  const classes = useFetch('/hod/classes');
  const [picked, setPicked] = useState('');
  return (
    <Page title="Weekly attendance sheets" subtitle="Any class: the same sheet class reps print on Fridays">
      <Async state={classes}>
        {(list) => {
          const selected = picked || list[0]?.code || '';
          return list.length === 0 ? <Card><p className="text-sm text-gray-500">No classes exist yet.</p></Card> : (
            <>
              <Card><label className="block max-w-sm">
                <span className="block text-xs font-bold text-gray-700 mb-1">Class</span>
                <select value={selected} onChange={(e) => setPicked(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                  {list.map((c) => <option key={c.code} value={c.code}>{c.code}{c.course ? ` · ${c.course}` : ''}</option>)}
                </select></label></Card>
              <WeeklySheet key={selected} basePath="/hod" classCode={selected} />
            </>
          );
        }}
      </Async>
    </Page>
  );
}
