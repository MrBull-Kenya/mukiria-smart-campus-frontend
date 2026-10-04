import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Stat, Card, Btn, Notice } from '../../components/ui';

export default function LibraryCheckin() {
  const state = useFetch('/campus/library/status', { pollMs: 15000 });
  const [msg, setMsg] = useState(null);
  const act = async (dir) => {
    setMsg(null);
    try { const res = await api.post(`/campus/library/${dir}`); setMsg({ kind: 'ok', text: res.data.message }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Library" subtitle="Check in when you enter and out when you leave">
      <Async state={state}>
        {(d) => (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="In the library now" value={`${d.currentOccupancy} / ${d.maxCapacity}`} tone={d.currentOccupancy >= d.maxCapacity ? 'red' : 'green'} />
              <Stat label="Visits today" value={d.dailyVisits} />
              <Stat label="You are" value={d.checkedIn ? 'Inside' : 'Outside'} tone={d.checkedIn ? 'blue' : 'gray'} />
            </div>
            <Card className="max-w-sm space-y-3">
              {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
              {d.checkedIn ? <Btn variant="danger" onClick={() => act('checkout')} className="w-full">Check out</Btn> : <Btn onClick={() => act('checkin')} className="w-full">Check in</Btn>}
            </Card>
          </>
        )}
      </Async>
    </Page>
  );
}
