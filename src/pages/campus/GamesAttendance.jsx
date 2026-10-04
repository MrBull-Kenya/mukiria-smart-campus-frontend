import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Card, Btn, Notice } from '../../components/ui';

const ACTIVITIES = ['Football', 'Volleyball', 'Netball', 'Athletics', 'Basketball', 'Other sports'];

export default function GamesAttendance() {
  const state = useFetch('/campus/games');
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [msg, setMsg] = useState(null);
  const record = async () => {
    setMsg(null);
    try { const res = await api.post('/campus/games', { activity }); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Games & sports attendance">
      <Card className="max-w-sm space-y-3">
        <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">{ACTIVITIES.map((a) => <option key={a}>{a}</option>)}</select>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <Btn onClick={record} className="w-full">Record attendance</Btn>
      </Card>
      <h2 className="text-sm font-bold text-gray-700">My recent activity</h2>
      <Async state={state}>{(rows) => <Table rows={rows} empty="No games attendance yet." columns={[{ key: 'date', label: 'Date' }, { key: 'time', label: 'Time' }, { key: 'activity', label: 'Activity' }]} />}</Async>
    </Page>
  );
}
