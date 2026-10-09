import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { getSocket } from '../../services/socket';
import { Page, Async, Notice } from '../../components/ui';

const chatTime = (message) => {
  if (!message.timestamp) return message.time || '';
  const date = new Date(message.timestamp);
  if (Number.isNaN(date.getTime())) return message.time || '';
  return new Intl.DateTimeFormat('en-KE', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  }).format(date);
};

// Shared by students (/student/chat) and class reps (same class room)
export function ChatRoom({ basePath }) {
  const { user } = useAuth();
  const history = useFetch(`${basePath}/chat`);
  const [live, setLive] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!user.class_code) return undefined;
    const socket = getSocket();
    socket.emit('join_class', user.class_code);
    const onMsg = (m) => { if (m.sender_id !== user.id) setLive((x) => [...x, { ...m, mine: false }]); };
    socket.on('receive_message', onMsg);
    return () => socket.off('receive_message', onMsg);
  }, [user.class_code, user.id]);

  const messages = useMemo(() => {
    const map = new Map();
    [...(history.data || []), ...live].forEach((m) => map.set(m.id, m));
    return [...map.values()].sort((a, b) => a.id - b.id);
  }, [history.data, live]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const res = await api.post(`${basePath}/chat`, { message: text });
      setLive((x) => [...x, res.data]); setText(''); setError('');
    } catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <div className="max-w-3xl rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-3 shadow-inner md:p-5">
      <div className="flex h-[65vh] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-xl shadow-slate-300/40 backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/80 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Class discussion</p>
            <p className="text-[11px] text-slate-500">Messages are shared with your class</p>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Live</span>
        </div>
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-blue-50/70 p-4">
          <div className="space-y-3">
            <Async state={history}>
              {() => (messages.length === 0
                ? <p className="py-8 text-center text-sm text-slate-400">No messages yet. Say hello 👋</p>
                : messages.map((m) => (
                  <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${m.mine ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : m.announcement ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800'}`}>
                      {!m.mine && <p className="mb-1 text-[11px] font-bold text-slate-500">{m.announcement ? '📢 ' : ''}{m.sender}</p>}
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`mt-1 text-right text-[10px] ${m.mine ? 'text-blue-100' : 'text-slate-400'}`}>{chatTime(m)}</p>
                    </div>
                  </div>
                )))}
            </Async>
            <div ref={endRef} />
          </div>
        </div>
        {error && <div className="px-4 pt-3"><Notice kind="error">{error}</Notice></div>}
        <form onSubmit={send} className="flex gap-2 border-t border-slate-100 bg-white p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your class…" className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none" />
          <button className="rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700">Send</button>
        </form>
      </div>
    </div>
  );
}

export default function ClassChat() {
  const { user } = useAuth();
  return (
    <Page title="Class chat" subtitle={user.class_code ? `Everyone in ${user.class_code}` : ''}>
      {user.class_code ? <ChatRoom basePath="/student" /> : <Notice kind="warn">Your account has no class assigned yet.</Notice>}
    </Page>
  );
}
