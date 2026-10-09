import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { getSocket } from '../../services/socket';
import { getCurrentPosition } from '../../services/geolocation';
import { useAuth } from '../../context/AuthContext';
import ScannerWithFace from '../../components/QR/ScannerWithFace';
import { getAdmNo } from '../../config/campus';
import { Page, Async, Card, Btn, Input, Notice } from '../../components/ui';

const ROTATE_SECONDS = 25; // server tokens live 30 s; rotating early leaves time for a slow scan + verify

function QrPanel({ session, onEnd }) {
  const { user, deviceId } = useAuth();
  const [token, setToken] = useState('');
  const [repCode, setRepCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [repCheckin, setRepCheckin] = useState(null);
  const [repCheckinBusy, setRepCheckinBusy] = useState(false);
  const [repCheckinError, setRepCheckinError] = useState('');
  const [repCheckinResult, setRepCheckinResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROTATE_SECONDS);
  const [error, setError] = useState('');
  const live = useFetch('/classrep/live-logs', { pollMs: 8000 });

  const fetchToken = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      const res = await api.post('/qr/generate', {
        session_id: session.id,
        venue: session.venue,
        gps_lat: position.latitude,
        gps_lng: position.longitude,
      });
      setToken(res.data.token); setRepCode(res.data.rep_checkin_code || ''); setError('');
    } catch (err) {
      setToken(''); setRepCode('');
      if (err?.name === 'GeolocationError') {
        const locationMessages = {
          1: 'Location permission is blocked for this site. Allow location access for mtti-smart-attendance.vercel.app in your browser settings, then retry.',
          2: 'Your device could not determine its location. Turn on precise location/GPS, move where GPS reception is clearer, and retry.',
          3: 'Getting your location took too long. Keep precise location/GPS on and retry.',
        };
        setError(locationMessages[err.code] || 'Location is unavailable in this browser. Allow site location access, then retry.');
      } else if (err?.response) {
        setError(getErrorMessage(err, 'Could not generate a QR token.'));
      } else {
        setError('Could not reach the attendance server. Check your internet connection and retry.');
      }
    }
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

  const startRepCheckin = async (event) => {
    event.preventDefault();
    setRepCheckinBusy(true); setRepCheckinError(''); setRepCheckinResult(null);
    try {
      const { data } = await api.post('/qr/rep-code/verify', { code: codeInput });
      setRepCheckin({ ...data.data, token: data.token });
    } catch (err) {
      setRepCheckinError(getErrorMessage(err, 'Could not verify the attendance code.'));
    } finally {
      setRepCheckinBusy(false);
    }
  };

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
      {user.role === 'student_rep' && (
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-3">
          <div className="text-center">
            <p className="text-xs text-gray-300">Class rep check-in code</p>
            <p className="font-mono text-3xl font-black tracking-[0.25em] text-white">{repCode || '--------'}</p>
            <p className="text-[10px] text-gray-400">Rotates with the QR. Enter this code below to check yourself in.</p>
          </div>
          {repCheckin ? (
            <ScannerWithFace
              sessionId={repCheckin.session_id}
              qrToken={repCheckin.token}
              admNo={getAdmNo(user)}
              classCode={repCheckin.class_code}
              onComplete={(result) => { setRepCheckin(null); setRepCheckinResult(result); }}
              onCancel={() => setRepCheckin(null)}
            />
          ) : (
            <form onSubmit={startRepCheckin} className="space-y-2">
              <Input
                label="Enter the code to check in yourself"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{8}"
                maxLength={8}
                required
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="8-digit code"
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
              {repCheckinError && <Notice kind="error">{repCheckinError}</Notice>}
              <Btn type="submit" disabled={repCheckinBusy || codeInput.length !== 8}>
                {repCheckinBusy ? 'Verifying…' : 'Continue to selfie check-in'}
              </Btn>
            </form>
          )}
          {repCheckinResult && (
            <Notice kind={repCheckinResult.queued ? 'warn' : 'ok'}>
              {repCheckinResult.queued ? 'Check-in saved offline and will sync when you are back online.' : `Your attendance is confirmed${repCheckinResult.is_late ? ' (late)' : ''}.`}
            </Notice>
          )}
        </div>
      )}
      {error && <Notice kind="error">{error} <button onClick={fetchToken} className="underline font-bold">Retry</button></Notice>}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4">
        <p className="text-sm text-gray-300">Checked in</p>
        <p className="text-2xl font-black text-green-400">{count}<span className="text-sm text-gray-400"> / {total}</span></p>
      </div>
      <p className="text-[11px] text-gray-400">The code changes every {ROTATE_SECONDS} seconds. Class reps can generate it from anywhere. Students must be on campus and within 20 m of the rep’s location when the code was generated. A selfie and registered phone are also required.</p>
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
