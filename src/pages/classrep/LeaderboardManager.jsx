import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Table, Btn, Notice } from '../../components/ui';

export default function LeaderboardManager() {
  const state = useFetch('/classrep/leaderboard');
  const [msg, setMsg] = useState(null);
  const reset = async () => {
    if (!window.confirm('Award weekly badges to the top 3 and reset EVERYONE\'s points to 0?')) return;
    try {
      const res = await api.post('/classrep/leaderboard/reset');
      setMsg({ kind: 'ok', text: `${res.data.message} ${res.data.winners.map((w) => `#${w.rank} ${w.name} (${w.points})`).join(', ')}` }); state.reload(true);
    } catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Class leaderboard" actions={<Btn variant="danger" onClick={reset}>Weekly reset</Btn>}>
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={state}>
        {(rows) => <Table rows={rows} empty="No students yet." columns={[{ key: 'rank', label: '#' }, { key: 'name', label: 'Name' }, { key: 'adm', label: 'Adm no' }, { key: 'points', label: 'Points' }]} />}
      </Async>
    </Page>
  );
}
