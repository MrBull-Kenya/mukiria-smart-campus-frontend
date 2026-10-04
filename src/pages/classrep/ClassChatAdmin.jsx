import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Card, Btn, Notice } from '../../components/ui';

export default function ClassChatAdmin() {
  const state = useFetch('/classrep/announcements');
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const post = async (e) => {
    e.preventDefault();
    try { await api.post('/classrep/announcements', { message: text }); setText(''); setMsg({ kind: 'ok', text: 'Announcement sent to the class chat.' }); state.reload(true); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };
  return (
    <Page title="Announcements" subtitle="Highlighted messages that appear at the top of your class chat" actions={<Link to="/student/chat" className="text-xs font-bold text-blue-600 underline">Open class chat</Link>}>
      <Card className="max-w-xl"><form onSubmit={post} className="space-y-3">
        <textarea required rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. CAT on Monday 8am, Lab 2" className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <Btn type="submit">📢 Post announcement</Btn>
      </form></Card>
      <Async state={state}>
        {(rows) => rows.length === 0 ? <Notice kind="info">No announcements yet.</Notice> : (
          <div className="space-y-2 max-w-xl">{rows.map((a) => <Card key={a.id}><p className="text-sm">{a.text}</p><p className="text-[11px] text-gray-400 mt-1">{a.date} {a.time} · {a.sender}</p></Card>)}</div>
        )}
      </Async>
    </Page>
  );
}
