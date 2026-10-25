import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import WeeklySheet from '../../components/WeeklySheet';
import { Page, Async, Card } from '../../components/ui';

export default function HodWeeklySheets() {
  const classes = useFetch('/hod/classes');
  const [department, setDepartment] = useState('');
  const [picked, setPicked] = useState('');
  return (
    <Page title="Weekly attendance sheets" subtitle="Any class: the same sheet class reps print on Fridays">
      <Async state={classes}>
        {(list) => {
          const departments = [...new Set(list.map((item) => String(item.department || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
          const filtered = department ? list.filter((item) => item.department === department) : list;
          const selected = filtered.some((item) => item.code === picked) ? picked : filtered[0]?.code || '';
          return list.length === 0 ? <Card><p className="text-sm text-gray-500">No classes exist yet.</p></Card> : (
            <>
              <Card className="flex flex-wrap gap-3">
                <label className="block w-full max-w-sm">
                  <span className="block text-xs font-bold text-gray-700 mb-1">Department</span>
                  <select value={department} onChange={(e) => { setDepartment(e.target.value); setPicked(''); }} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                    <option value="">All departments</option>
                    {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block w-full max-w-sm">
                  <span className="block text-xs font-bold text-gray-700 mb-1">Class</span>
                  <select value={selected} onChange={(e) => setPicked(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                    {filtered.map((c) => <option key={c.code} value={c.code}>{c.code}{c.course ? ` · ${c.course}` : ''}</option>)}
                  </select>
                </label>
              </Card>
              {selected
                ? <WeeklySheet key={selected} basePath="/hod" classCode={selected} />
                : <Card><p className="text-sm text-gray-500">No classes are assigned to this department.</p></Card>}
            </>
          );
        }}
      </Async>
    </Page>
  );
}
