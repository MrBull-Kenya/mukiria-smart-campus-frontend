import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { getSocket } from '../../services/socket';
import { getCurrentPosition } from '../../services/geolocation';
import { useAuth } from '../../context/AuthContext';
import SubmitQrCheckin from '../../components/QR/SubmitQrCheckin';
import { getAdmNo } from '../../config/campus';
import { Page, Async, Card, Btn, Input, Notice } from '../../components/ui';
import instituteLogo from '../../assets/mtti-logo.png';

const ROTATE_SECONDS = 25; // server tokens live 30 s; rotating early leaves time for a slow scan + verify

function ActingRepManager() {
  const state = useFetch('/classrep/acting-rep');
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const appoint = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/classrep/acting-rep', { user_id: Number(userId) });
      setMessage(data.message);
      setUserId('');
      await state.reload(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not appoint an Acting Rep.'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const assignment = state.data?.assignment;
    if (!assignment || !window.confirm(`Revoke Acting Rep access for ${assignment.name}?`)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post(`/classrep/acting-rep/${assignment.id}/revoke`);
      setMessage(data.message);
      await state.reload(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not revoke the Acting Rep appointment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-5 border-indigo-100 shadow-sm">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" /></svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-slate-900">Appoint an Acting Rep</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Choose an active trainee in your class. Their temporary access expires after 6 hours and can be revoked sooner.</p>
          {error && <div className="mt-3"><Notice kind="error">{error}</Notice></div>}
          {message && <div className="mt-3"><Notice kind="ok">{message}</Notice></div>}
          <Async state={state}>
            {(data) => data.assignment ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <div>
                  <p className="text-sm font-bold text-indigo-900">{data.assignment.name}</p>
                  <p className="mt-0.5 text-xs text-indigo-800">Access expires {data.assignment.expiresAt}.</p>
                </div>
                <Btn type="button" variant="danger" disabled={busy} onClick={revoke}>{busy ? 'Updating…' : 'Revoke access'}</Btn>
              </div>
            ) : (
              <form onSubmit={appoint} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="block flex-1 text-xs font-bold text-slate-700">
                  Trainee in your class
                  <select required value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Choose a trainee…</option>
                    {data.members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.adm_no}</option>)}
                  </select>
                </label>
                <Btn type="submit" disabled={busy || !userId}>{busy ? 'Appointing…' : 'Appoint for 6 hours'}</Btn>
              </form>
            )}
          </Async>
        </div>
      </div>
    </Card>
  );
}

function QrPanel({ session, onEnd, sessionError, ending }) {
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
      setToken(res.data.token);
      setRepCode(res.data.rep_checkin_code || '');
      setError('');
    } catch (err) {
      setToken('');
      setRepCode('');
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
    setRepCheckinBusy(true);
    setRepCheckinError('');
    setRepCheckinResult(null);
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
    <div className="mx-auto grid w-full max-w-5xl items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <section aria-labelledby="active-session-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.04]">
        <header className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Session active
              </span>
              <h2 id="active-session-title" className="mt-3 truncate text-xl font-extrabold tracking-tight text-slate-900">{session.unit_name}</h2>
              <p className="mt-1 text-sm text-slate-600">{user.class_code} <span aria-hidden="true">·</span> {session.lecturer_name}</p>
              {session.venue && <p className="mt-1 text-xs text-slate-500">{session.venue}</p>}
            </div>
            {session.startedAt && (
            <p className="text-xs text-slate-500">Time in <span className="font-semibold text-slate-700">{session.startedAt} EAT</span></p>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Scan to check in</h3>
                <p className="mt-0.5 text-xs text-slate-500">Keep this page visible to your class.</p>
              </div>
              <div role="timer" aria-live="off" aria-label={`QR code refreshes in ${timeLeft} seconds`} className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-right shadow-sm">
                <span className="block text-lg font-extrabold leading-5 tabular-nums text-blue-700">{timeLeft}s</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">next code</span>
              </div>
            </div>
            <div className="mx-auto flex min-h-64 max-w-sm items-center justify-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:min-h-80">
              {token
                ? <QRCodeSVG
                  value={token}
                  size={260}
                  level="H"
                  includeMargin
                  fgColor="#1e3a8a"
                  imageSettings={{ src: instituteLogo, width: 52, height: 52, excavate: true }}
                  className="h-auto w-full max-w-[260px]"
                />
                : <div role="status" className="space-y-3 text-center">
                  <span aria-hidden="true" className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
                  <p className="text-sm font-medium text-slate-600">Generating secure code…</p>
                </div>}
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Code refreshes automatically</span>
                <span>{timeLeft}s remaining</span>
              </div>
              <p className="mb-2 text-[10px] text-slate-500">Trainees must scan within 20 metres of this QR location.</p>
              <div
                role="progressbar"
                aria-label="Time remaining before the QR code refreshes"
                aria-valuemin={0}
                aria-valuemax={ROTATE_SECONDS}
                aria-valuenow={timeLeft}
                className="h-1.5 overflow-hidden rounded-full bg-blue-100"
              >
                <div className="h-full rounded-full bg-blue-600 transition-[width] duration-1000" style={{ width: `${(timeLeft / ROTATE_SECONDS) * 100}%` }} />
              </div>
            </div>
          </div>
          {error && <div className="mt-4"><Notice kind="error">{error} <button type="button" onClick={fetchToken} className="ml-1 font-bold underline underline-offset-2">Retry</button></Notice></div>}
          <p className="mt-4 text-xs leading-5 text-slate-500">
            The code changes every {ROTATE_SECONDS} seconds. Students must use their registered phone while on campus and within 20 m of your location when the code is generated.
          </p>
        </div>
      </section>

      <aside className="space-y-4">
        <section aria-label="Live attendance" className="rounded-2xl border border-blue-100 bg-blue-700 p-5 text-white shadow-sm shadow-blue-900/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-100">Live attendance</p>
              <p className="mt-1 text-xs text-blue-100/80">Successful check-ins for this session</p>
            </div>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-blue-100">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
            </svg>
          </div>
          <p className="mt-5 text-4xl font-black tracking-tight tabular-nums" aria-live="polite">
            {count}<span className="ml-1 text-lg font-semibold text-blue-100">/ {total}</span>
          </p>
          <p className="mt-1 text-xs text-blue-100">trainees checked in</p>
        </section>

        {user.role === 'student_rep' && (
          <section aria-labelledby="rep-checkin-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03]">
            <div className="mb-4">
              <h3 id="rep-checkin-title" className="text-sm font-extrabold text-slate-900">Your attendance</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Enter your rotating check-in code to verify your own attendance.</p>
            </div>
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Your current code</p>
              <p className="mt-1 font-mono text-3xl font-black tracking-[0.22em] text-blue-900" aria-live="polite">{repCode || '--------'}</p>
              <p className="mt-1 text-[10px] text-slate-500">Refreshes with the QR code</p>
            </div>
            {repCheckin ? (
              <SubmitQrCheckin
                sessionId={repCheckin.session_id}
                qrToken={repCheckin.token}
                admNo={getAdmNo(user)}
                onComplete={(result) => { setRepCheckin(null); setRepCheckinResult(result); }}
                onCancel={() => setRepCheckin(null)}
              />
            ) : (
              <form onSubmit={startRepCheckin} className="space-y-3">
                <Input
                  label="8-digit check-in code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  disabled={!repCode || !!repCheckinResult}
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Enter your code"
                  className="font-mono tracking-widest"
                />
                {repCheckinError && <Notice kind="error">{repCheckinError}</Notice>}
                <Btn type="submit" disabled={!repCode || repCheckinBusy || codeInput.length !== 8 || !!repCheckinResult} className="w-full">
                  {repCheckinBusy ? 'Verifying code…' : 'Verify code & check in'}
                </Btn>
              </form>
            )}
            {repCheckinResult && (
              <div className="mt-3">
                <Notice kind={repCheckinResult.queued ? 'warn' : 'ok'}>
                  {repCheckinResult.queued ? 'Check-in saved offline and will sync when you are back online.' : `Your attendance is confirmed${repCheckinResult.is_late ? ' (late)' : ''}.`}
                </Notice>
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-900">When the class is ready</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">End the session after trainees have checked in. This stops QR generation and attendance collection.</p>
          {sessionError && <div className="mt-3"><Notice kind="error">{sessionError}</Notice></div>}
          <Btn variant="danger" onClick={onEnd} disabled={ending} className="mt-4 w-full min-h-11">{ending ? 'Recording time out…' : 'End session'}</Btn>
        </section>
      </aside>
    </div>
  );
}

export default function GenerateQR() {
  const current = useFetch('/classrep/sessions/current');
  const lecturers = useFetch('/classrep/lecturers');
  const [form, setForm] = useState({ unit_name: '', lecturer_name: '', venue: '', late_threshold_mins: 15 });
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [endedMessage, setEndedMessage] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const start = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    setEndedMessage('');
    try { await api.post('/classrep/sessions', form); await current.reload(); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const end = async () => {
    setError('');
    setEnding(true);
    try {
      const { data } = await api.post('/classrep/sessions/end');
      setEndedMessage(`Time out recorded at ${data.endedAt} EAT.`);
      current.setData({ session: null });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not end this session. Please try again.'));
    } finally {
      setEnding(false);
    }
  };

  return (
    <Page title="Attendance QR" subtitle="Start a session for the lesson, then show the rotating code to your class">
      <ActingRepManager />
      <Async state={current}>
        {(d) => (d.session ? <QrPanel session={d.session} onEnd={end} ending={ending} sessionError={error} /> : renderStartForm())}
      </Async>
    </Page>
  );

  // Plain function (not a component): defining a component inside another one would remount it on every keystroke
  function renderStartForm() {
    return (
      <Card className="max-w-md">
        <form onSubmit={start} className="space-y-3">
          {endedMessage && <Notice kind="ok">{endedMessage}</Notice>}
          {error && <Notice kind="error">{error}</Notice>}
          <Input label="Unit / subject" required value={form.unit_name} onChange={set('unit_name')} placeholder="e.g. Computer Networking" />
          <Input label="Lecturer" required list="lecturer-list" value={form.lecturer_name} onChange={set('lecturer_name')} placeholder="Pick or type the lecturer's name" />
          <datalist id="lecturer-list">{(lecturers.data || []).map((l) => <option key={l.id} value={l.name} />)}</datalist>
          <Input label="Venue" value={form.venue} onChange={set('venue')} placeholder="e.g. Lab 1" />
          <Input label="Late after (minutes)" type="number" min="1" max="120" value={form.late_threshold_mins} onChange={set('late_threshold_mins')} />
          <Btn type="submit" disabled={busy}>{busy ? 'Starting…' : 'Start session & show QR'}</Btn>
        </form>
      </Card>
    );
  }
}
