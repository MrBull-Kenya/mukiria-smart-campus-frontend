import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { getSocket } from '../../services/socket';
import { Page, Async, Notice } from '../../components/ui';

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
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-[65vh] max-w-2xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <Async state={history}>
          {() => (messages.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">No messages yet. Say hello 👋</p>
            : messages.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-blue-600 text-white' : m.announcement ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-gray-100 text-gray-800'}`}>
                  {!m.mine && <p className="text-[11px] font-bold opacity-70">{m.announcement ? '📢 ' : ''}{m.sender}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className="text-[10px] opacity-60 text-right mt-0.5">{m.time}</p>
                </div>
              </div>
            )))}
        </Async>
        <div ref={endRef} />
      </div>
      {error && <div className="px-4"><Notice kind="error">{error}</Notice></div>}
      <form onSubmit={send} className="p-3 border-t border-gray-100 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message your class…" className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
        <button className="bg-blue-600 text-white text-xs font-bold px-4 rounded-xl hover:bg-blue-700">Send</button>
      </form>
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
