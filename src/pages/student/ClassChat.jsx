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

function ChatAttachment({ attachment }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl = '';
    let active = true;
    api.get(attachment.url, { responseType: 'blob' })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        if (active) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Could not load attachment.')); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.url]);

  if (error) return <p className="mt-2 text-xs opacity-80">{error}</p>;
  if (!url) return <p className="mt-2 text-xs opacity-70">Loading {attachment.name}…</p>;
  if (attachment.type.startsWith('image/')) return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.name} className="mt-2 max-h-72 max-w-full rounded-lg object-contain" /></a>;
  if (attachment.type.startsWith('video/')) return <video src={url} controls preload="metadata" className="mt-2 max-h-72 max-w-full rounded-lg" />;
  return <a href={url} download={attachment.name} className="mt-2 inline-flex max-w-full items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs font-semibold underline underline-offset-2">{attachment.name}</a>;
}

// Shared by students (/student/chat) and class reps (same class room)
export function ChatRoom({ basePath }) {
  const { user } = useAuth();
  const history = useFetch(`${basePath}/chat`);
  const [live, setLive] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeActions, setActiveActions] = useState(null);
  const [deletedIds, setDeletedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const touchStartX = useRef(null);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);

  useEffect(() => {
    if (!user.class_code) return undefined;
    const socket = getSocket();
    socket.emit('join_class', user.class_code);
    const onMsg = (m) => { if (m.sender_id !== user.id) setLive((x) => [...x, { ...m, mine: false }]); };
    const onUpdate = (m) => setLive((x) => [...x.filter((item) => item.id !== m.id), { ...m, mine: m.sender_id === user.id }]);
    const onDelete = ({ id }) => {
      setDeletedIds((x) => [...new Set([...x, id])]);
      setLive((x) => x.map((m) => m.reply?.id === id ? { ...m, reply: null } : m));
    };
    socket.on('receive_message', onMsg);
    socket.on('message_updated', onUpdate);
    socket.on('message_deleted', onDelete);
    return () => {
      socket.off('receive_message', onMsg);
      socket.off('message_updated', onUpdate);
      socket.off('message_deleted', onDelete);
    };
  }, [user.class_code, user.id]);

  const messages = useMemo(() => {
    const map = new Map();
    [...(history.data || []), ...live].forEach((m) => map.set(m.id, m));
    return [...map.values()].filter((m) => !deletedIds.includes(m.id)).sort((a, b) => a.id - b.id);
  }, [history.data, live, deletedIds]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const send = async (e) => {
    e.preventDefault();
    if (editingId) {
      if (!text.trim()) return;
      setBusy(true);
      try {
        const { data } = await api.patch(`${basePath}/chat/${editingId}`, { message: text });
        setLive((x) => [...x.filter((m) => m.id !== data.id), data]);
        setText(''); setEditingId(null); setError('');
      } catch (err) { setError(getErrorMessage(err)); }
      finally { setBusy(false); }
      return;
    }
    if (!text.trim()) return;
    try {
      const res = await api.post(`${basePath}/chat`, { message: text, reply_to: replyTarget?.id });
      setLive((x) => [...x, res.data]); setText(''); setError('');
      setReplyTarget(null);
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const sendAttachment = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('attachment', file);
    form.append('message', text);
    if (replyTarget) form.append('reply_to', String(replyTarget.id));
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`${basePath}/chat`, form);
      setLive((x) => [...x, data]); setText(''); setReplyTarget(null);
    } catch (err) { setError(getErrorMessage(err, 'Could not send this attachment.')); }
    finally { setBusy(false); }
  };

  const startEdit = (message) => {
    setEditingId(message.id); setReplyTarget(null); setText(message.text || '');
    setActiveActions(null); setError('');
  };

  const removeMessage = async (message) => {
    if (!window.confirm('Delete this message for everyone in the class?')) return;
    setBusy(true); setError('');
    try {
      await api.delete(`${basePath}/chat/${message.id}`);
      setDeletedIds((x) => [...new Set([...x, message.id])]);
      setLive((x) => x.filter((m) => m.id !== message.id).map((m) => m.reply?.id === message.id ? { ...m, reply: null } : m));
      setActiveActions(null);
    } catch (err) { setError(getErrorMessage(err, 'Could not delete this message.')); }
    finally { setBusy(false); }
  };

  const replyTo = (message) => {
    setReplyTarget({ id: message.id, text: message.text || message.attachment?.name || 'Attachment', sender: message.sender });
    setEditingId(null); setActiveActions(null);
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
                    <div
                      className={`max-w-[88%] touch-pan-y ${m.mine ? 'text-right' : 'text-left'}`}
                      onTouchStart={(e) => { touchStartX.current = e.changedTouches[0].clientX; }}
                      onTouchEnd={(e) => {
                        if (touchStartX.current == null) return;
                        if (Math.abs(e.changedTouches[0].clientX - touchStartX.current) > 45) setActiveActions(m.id);
                        touchStartX.current = null;
                      }}
                    >
                      <div className={`rounded-2xl px-3.5 py-2.5 text-left text-sm shadow-sm ${m.mine ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : m.announcement ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950' : 'rounded-bl-md border border-slate-100 bg-white text-slate-800'}`}>
                        {!m.mine && <p className="mb-1 text-[11px] font-bold text-slate-500">{m.announcement ? '📢 ' : ''}{m.sender}</p>}
                        {m.reply && <div className={`mb-2 rounded-lg border-l-2 px-2 py-1 text-xs ${m.mine ? 'border-blue-200 bg-white/10 text-blue-100' : 'border-blue-400 bg-blue-50 text-slate-600'}`}><strong>{m.reply.sender}</strong><p className="truncate">{m.reply.text}</p></div>}
                        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        {m.attachment && <ChatAttachment attachment={m.attachment} />}
                        <p className={`mt-1 text-right text-[10px] ${m.mine ? 'text-blue-100' : 'text-slate-400'}`}>{chatTime(m)}{m.edited ? ' · edited' : ''}</p>
                      </div>
                      <div className={`mt-1 flex flex-wrap gap-2 text-[11px] transition-all ${activeActions === m.id ? 'max-h-10 opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`}>
                        <button type="button" onClick={() => replyTo(m)} className="rounded-full bg-white px-2.5 py-1 font-semibold text-blue-700 shadow-sm">Reply</button>
                        {m.mine && !m.announcement && <button type="button" onClick={() => startEdit(m)} className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-sm">Edit</button>}
                        {m.mine && !m.announcement && <button type="button" disabled={busy} onClick={() => removeMessage(m)} className="rounded-full bg-white px-2.5 py-1 font-semibold text-rose-700 shadow-sm disabled:opacity-50">Delete</button>}
                      </div>
                      <button type="button" onClick={() => setActiveActions(activeActions === m.id ? null : m.id)} className="mt-1 text-[10px] font-semibold text-slate-400 underline decoration-dotted underline-offset-2 focus:text-blue-600">Message actions</button>
                    </div>
                  </div>
                )))}
            </Async>
            <div ref={endRef} />
          </div>
        </div>
        {error && <div className="px-4 pt-3"><Notice kind="error">{error}</Notice></div>}
        <form onSubmit={send} className="border-t border-slate-100 bg-white p-3">
          {(replyTarget || editingId) && <div className="mb-2 flex items-center justify-between rounded-lg border-l-2 border-blue-500 bg-blue-50 px-3 py-2 text-xs text-slate-600"><span className="truncate">{editingId ? 'Editing your message' : `Replying to ${replyTarget.sender}: ${replyTarget.text}`}</span><button type="button" onClick={() => { setReplyTarget(null); setEditingId(null); setText(''); }} className="ml-2 font-bold text-slate-500" aria-label="Cancel reply or edit">✕</button></div>}
          <div className="flex items-center gap-2">
            {!editingId && <>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/pdf,text/plain,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; sendAttachment(file); }} />
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; sendAttachment(file); }} />
              <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} aria-label="Attach photo, video, or document" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">+</button>
              <button type="button" disabled={busy} onClick={() => cameraInput.current?.click()} aria-label="Take a photo" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700 hover:bg-slate-200 disabled:opacity-50">📷</button>
            </>}
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder={editingId ? 'Edit your message…' : 'Message your class…'} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none" />
            <button disabled={busy || (!text.trim() && !!editingId)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50">{busy ? '…' : editingId ? 'Save' : 'Send'}</button>
          </div>
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
