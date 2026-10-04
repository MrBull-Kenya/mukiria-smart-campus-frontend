import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { Page, Async, Card, Btn, Input, Notice } from '../../components/ui';

const ROTATE_SECONDS = 25; // server tokens live 30 s; rotating early leaves time for a slow scan + verify

function QrPanel({ session, onEnd }) {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROTATE_SECONDS);
  const [error, setError] = useState('');
  const live = useFetch('/classrep/live-logs', { pollMs: 8000 });

  const fetchToken = useCallback(async () => {
    try {
      const res = await api.post('/qr/generate', { session_id: session.id, venue: session.venue });
      setToken(res.data.token); setError('');
    } catch (err) { setError(getErrorMessage(err, 'Could not generate a QR token.')); }
    setTimeLeft(ROTATE_SECONDS);
  }, [session.id, session.venue]);

  useEffect(() => {
    fetchToken();
    const timer = setInterval(() => setTimeLeft((t) => { if (t <= 1) { fetchToken(); return ROTATE_SECONDS; } return t - 1; }), 1000);
    return () => clearInterval(timer);
  }, [fetchToken]);

  useEffect(() => {
    if (!user.class_code) return undefined;
    const socket = getSocket();
    socket.emit('join_class', user.class_code);
    const bump = () => live.reload(true);
    socket.on('attendance_update', bump);
    return () => socket.off('attendance_update', bump);
  }, [user.class_code]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = live.data?.logs?.length ?? 0;
  const total = live.data?.total ?? 0;

  return (
    <div className="bg-gray-900 text-white p-6 rounded-3xl max-w-xl mx-auto space-y-5">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-green-400 font-bold truncate">{session.unit_name}</p>
          <p className="text-xs text-gray-400 truncate">{user.class_code} · {session.lecturer_name}{session.venue ? ` · ${session.venue}` : ''}</p>
        </div>
        <div className="text-right shrink-0"><p className="text-3xl font-black text-yellow-400">{timeLeft}s</p><p className="text-[10px] text-gray-400">next code</p></div>
      </div>
      <div className="bg-white rounded-2xl p-5 flex justify-center">
        {token ? <QRCodeSVG value={token} size={260} level="M" includeMargin /> : <p className="text-gray-500 text-sm p-16">Generating secure code…</p>}
      </div>
      {error && <Notice kind="error">{error} <button onClick={fetchToken} className="underline font-bold">Retry</button></Notice>}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4">
        <p className="text-sm text-gray-300">Checked in</p>
        <p className="text-2xl font-black text-green-400">{count}<span className="text-sm text-gray-400"> / {total}</span></p>
      </div>
      <p className="text-[11px] text-gray-400">The code changes every {ROTATE_SECONDS} seconds so a screenshot can't be shared. Each check-in also needs a selfie, the student's own phone and GPS inside the campus.</p>
      <Btn variant="danger" onClick={onEnd} className="w-full">End session</Btn>
    </div>
  );
}

export default function GenerateQR() {
  const current = useFetch('/classrep/sessions/current');
  const lecturers = useFetch('/classrep/lecturers');
  const [form, setForm] = useState({ unit_name: '', lecturer_name: '', venue: '', late_threshold_mins: 15 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const start = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api.post('/classrep/sessions', form); await current.reload(); }
    catch (err) { setError(getErrorMessage(err)); }
    setBusy(false);
  };
  const end = async () => { await api.post('/classrep/sessions/end'); current.setData({ session: null }); };

  return (
    <Page title="Attendance QR" subtitle="Start a session for the lesson, then show the rotating code to your class">
      <Async state={current}>
        {(d) => (d.session ? <QrPanel session={d.session} onEnd={end} /> : renderStartForm())}
      </Async>
    </Page>
  );

  // Plain function (not a component): defining a component inside another one would remount it on every keystroke
  function renderStartForm() {
    return (
      <Card className="max-w-md">
        <form onSubmit={start} className="space-y-3">
          <Input label="Unit / subject" required value={form.unit_name} onChange={set('unit_name')} placeholder="e.g. Computer Networking" />
          <Input label="Lecturer" required list="lecturer-list" value={form.lecturer_name} onChange={set('lecturer_name')} placeholder="Pick or type the lecturer's name" />
          <datalist id="lecturer-list">{(lecturers.data || []).map((l) => <option key={l.id} value={l.name} />)}</datalist>
          <Input label="Venue" value={form.venue} onChange={set('venue')} placeholder="e.g. Lab 1" />
          <Input label="Late after (minutes)" type="number" min="1" max="120" value={form.late_threshold_mins} onChange={set('late_threshold_mins')} />
          {error && <Notice kind="error">{error}</Notice>}
          <Btn type="submit" disabled={busy}>{busy ? 'Starting…' : 'Start session & show QR'}</Btn>
        </form>
      </Card>
    );
  }
}
