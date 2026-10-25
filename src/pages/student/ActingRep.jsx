import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { getCurrentPosition } from '../../services/geolocation';
import { Page, Async, Card, Btn, Input, Notice } from '../../components/ui';
import instituteLogo from '../../assets/mtti-logo.png';

const ROTATE_SECONDS = 25;

export default function ActingRep() {
  const state = useFetch('/student/acting-rep', { pollMs: 10000 });
  const [form, setForm] = useState({ unit_name: '', lecturer_name: '', venue: '', late_threshold_mins: 15 });
  const [token, setToken] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROTATE_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchToken = useCallback(async (session) => {
    if (!session) return;
    try {
      const position = await getCurrentPosition();
      const { data } = await api.post('/qr/generate', {
        session_id: session.id,
        venue: session.venue,
        gps_lat: position.latitude,
        gps_lng: position.longitude,
      });
      setToken(data.token);
      setError('');
    } catch (err) {
      setToken('');
      setError(getErrorMessage(err, 'Could not generate a session QR code.'));
    }
    setTimeLeft(ROTATE_SECONDS);
  }, []);

  const session = state.data?.session;
  useEffect(() => {
    if (!session) {
      setToken('');
      return undefined;
    }
    fetchToken(session);
    const timer = setInterval(() => setTimeLeft((remaining) => {
      if (remaining <= 1) {
        fetchToken(session);
        return ROTATE_SECONDS;
      }
      return remaining - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [fetchToken, session?.id]);

  const updateForm = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const startSession = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.post('/student/acting-rep/sessions', form);
      setForm({ unit_name: '', lecturer_name: '', venue: '', late_threshold_mins: 15 });
      await state.reload(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not start the class session.'));
    } finally {
      setBusy(false);
    }
  };

  const endSession = async () => {
    if (!window.confirm('End this class session and stop accepting QR check-ins?')) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/student/acting-rep/sessions/end');
      setMessage(`Session ended at ${data.endedAt} EAT.`);
      setToken('');
      await state.reload(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not end the class session.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="Acting Rep" subtitle="Temporary class-session tools granted by your Class Rep">
      {error && <div className="mb-4"><Notice kind="error">{error}</Notice></div>}
      {message && <div className="mb-4"><Notice kind="ok">{message}</Notice></div>}
      <Async state={state}>
        {(data) => !data.assignment ? (
          <Card className="max-w-2xl">
            <h2 className="text-base font-extrabold text-slate-900">No active appointment</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your Class Rep has not appointed you as Acting Rep, or your temporary access has expired or been revoked. Your regular trainee account and attendance features are unchanged.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Notice kind="warn">Acting Rep access expires {data.assignment.expiresAt}. You may manage your class session and show its QR code. Your normal trainee check-in rules still apply.</Notice>
            {data.session ? (
              <Card className="mx-auto max-w-2xl text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Session active · {data.session.startedAt} EAT</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{data.session.unit_name}</h2>
                <p className="mt-1 text-sm text-slate-600">{data.session.lecturer_name}{data.session.venue ? ` · ${data.session.venue}` : ''}</p>
                <div className="mx-auto mt-5 flex min-h-72 max-w-sm items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
                  {token ? <QRCodeSVG value={token} size={260} level="H" includeMargin fgColor="#1e3a8a" imageSettings={{ src: instituteLogo, width: 52, height: 52, excavate: true }} className="h-auto w-full max-w-[260px]" /> : <p className="text-sm text-slate-500">Getting location and generating QR…</p>}
                </div>
                <p className="mt-3 text-xs text-slate-500">Refreshes in {timeLeft}s. Trainees must check in from campus and stay within 20 metres of this QR location.</p>
                <Btn type="button" variant="danger" disabled={busy} onClick={endSession} className="mt-5">{busy ? 'Updating…' : 'End session'}</Btn>
              </Card>
            ) : (
              <Card className="mx-auto max-w-xl">
                <h2 className="text-base font-extrabold text-slate-900">Start a class session</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Use this only when you are covering for your Class Rep. One active session is allowed per class.</p>
                <form onSubmit={startSession} className="mt-4 space-y-3">
                  <Input label="Unit / subject" required value={form.unit_name} onChange={updateForm('unit_name')} placeholder="e.g. Computer Networking" />
                  <Input label="Lecturer" required value={form.lecturer_name} onChange={updateForm('lecturer_name')} placeholder="Lecturer's name" />
                  <Input label="Venue" value={form.venue} onChange={updateForm('venue')} placeholder="e.g. Lab 1" />
                  <Input label="Late after (minutes)" type="number" min="1" max="120" value={form.late_threshold_mins} onChange={updateForm('late_threshold_mins')} />
                  <Btn type="submit" disabled={busy}>{busy ? 'Starting…' : 'Start session & show QR'}</Btn>
                </form>
              </Card>
            )}
          </div>
        )}
      </Async>
    </Page>
  );
}
