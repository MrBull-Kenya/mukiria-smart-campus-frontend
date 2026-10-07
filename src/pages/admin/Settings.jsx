import React, { useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Card, Btn, Notice, Stat, Badge } from '../../components/ui';


// Outgoing email (password-reset links etc.): shows what is configured and lets the Administrator send a real test message
function EmailCard() {
  const state = useFetch('/admin/email');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const sendTest = async () => {
    setBusy(true); setMsg(null);
    try { const res = await api.post('/admin/email/test', { to: to.trim() }); setMsg({ kind: 'ok', text: res.data.message }); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };

  return (
    <Card className="max-w-xl space-y-3">
      <p className="text-sm font-bold text-gray-800">Email (password-reset links)</p>
      <Async state={state}>
        {(e) => (
          <>
            {e.configured ? (
              <div className="text-xs text-gray-700 space-y-1">
                <p><Badge tone="green">Configured</Badge></p>
                <p>Mail server: <strong>{e.host}:{e.port}</strong> ({e.secure ? 'secure connection' : 'STARTTLS'})</p>
                <p>Signs in as: <strong>{e.user}</strong></p>
                <p>Sends from: <strong>{e.from}</strong></p>
                <p>Links in emails open: <strong>{e.frontendUrl || 'not set'}</strong></p>
              </div>
            ) : (
              <Notice kind="warn">
                Email is <strong>not set up</strong>, so nobody can reset a forgotten password by email. Missing: <strong>{e.missing.join(', ')}</strong>.
                Add them to <code>backend/.env</code> (see <code>.env.example</code>) and restart the server. For Gmail use an App Password.
              </Notice>
            )}
            {e.configured && !e.frontendUrl && <Notice kind="warn">FRONTEND_URL is not set, so emails will contain a code instead of a clickable link. Set it to the address people open the app at.</Notice>}
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <label className="block flex-1 min-w-[12rem]">
                <span className="block text-xs font-bold text-gray-700 mb-1">Send a test email to</span>
                <input type="email" value={to} onChange={(ev) => setTo(ev.target.value)} placeholder="leave empty to use your own email" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm" />
              </label>
              <Btn onClick={sendTest} disabled={busy || !e.configured}>{busy ? 'Sending…' : 'Send test email'}</Btn>
            </div>
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
          </>
        )}
      </Async>
    </Card>
  );
}

export default function AdminSettings() {
  const state = useFetch('/admin/settings');
  const [value, setValue] = useState(null); // null = show what is saved
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const save = async (term_start) => {
    setBusy(true); setMsg(null);
    try { const res = await api.put('/admin/settings', { term_start }); setMsg({ kind: 'ok', text: res.data.message }); setValue(null); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };

  return (
    <Page title="Settings" subtitle="Details printed on the weekly attendance register (form MTTI/REG/CUR/01)">
      <Async state={state}>
        {(d) => {
          const shown = value ?? d.termStart ?? '';
          return (
            <>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <Stat label="Term start" value={d.termStart || 'Not set'} tone={d.termStart ? 'gray' : 'amber'} />
                <Stat label="Current week" value={d.currentWeek ? `Week ${d.currentWeek}` : '—'} tone="blue" />
              </div>
              <Card className="max-w-md space-y-3">
                <p className="text-sm font-bold text-gray-800">Term start date</p>
                <p className="text-xs text-gray-600">The first day of <strong>week 1</strong> of the term. The register's <strong>WEEK</strong> field is counted from this date (any day in the first week works). Update it each term.</p>
                <input type="date" value={shown} onChange={(e) => setValue(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
                <div className="flex gap-2">
                  <Btn onClick={() => save(shown)} disabled={busy || !shown}>{busy ? 'Saving…' : 'Save'}</Btn>
                  <Btn variant="ghost" onClick={() => save('')} disabled={busy || !d.termStart}>Clear</Btn>
                </div>
              </Card>
              <EmailCard />
              <Notice kind="info">The <strong>department</strong> printed on each register is set per class on the Classes page.</Notice>
            </>
          );
        }}
      </Async>
    </Page>
  );
}
