import React, { useEffect, useMemo, useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Badge, Btn, Card, Notice, Stat } from '../../components/ui';

const PIN_TOKEN_KEY = 'mtt_manual_attendance_pin';
const emptyPinForm = { pin: '', confirmPin: '' };
const emptyChangeForm = { oldPin: '', newPin: '', confirmPin: '' };
const pinInputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

export default function ManualAttendance() {
  const pinStatus = useFetch('/classrep/manual-attendance-pin/status');
  const [unlocked, setUnlocked] = useState(() => !!sessionStorage.getItem(PIN_TOKEN_KEY));
  const state = useFetch('/classrep/manual-attendance', { enabled: unlocked, pollMs: 10000 });
  const [search, setSearch] = useState('');
  const [busyAdm, setBusyAdm] = useState('');
  const [busyPin, setBusyPin] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinForm, setPinForm] = useState(emptyPinForm);
  const [changeForm, setChangeForm] = useState(emptyChangeForm);
  const [msg, setMsg] = useState(null);
  const students = state.data?.students || [];
  const configured = !!pinStatus.data?.configured;

  useEffect(() => {
    const lockPage = () => {
      setUnlocked(false);
      setChangingPin(false);
      setPin('');
      setPinForm(emptyPinForm);
      setChangeForm(emptyChangeForm);
      setMsg({ kind: 'warn', text: 'PIN access expired. Enter your PIN to continue.' });
    };
    window.addEventListener('mtt:manual-attendance-locked', lockPage);
    return () => window.removeEventListener('mtt:manual-attendance-locked', lockPage);
  }, []);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? students.filter((student) => `${student.name} ${student.adm}`.toLowerCase().includes(term)) : students;
  }, [students, search]);

  const unlock = async (event) => {
    event.preventDefault();
    setBusyPin(true);
    setMsg(null);
    try {
      if (!configured) {
        await api.post('/classrep/manual-attendance-pin/setup', pinForm);
        setPinForm(emptyPinForm);
        await pinStatus.reload(true);
        setMsg({ kind: 'ok', text: 'PIN created. Enter it below to unlock attendance marking.' });
      } else {
        const { data } = await api.post('/classrep/manual-attendance-pin/unlock', { pin });
        sessionStorage.setItem(PIN_TOKEN_KEY, data.token);
        setPin('');
        setUnlocked(true);
      }
    } catch (err) {
      setMsg({ kind: 'error', text: getErrorMessage(err, 'Could not update Mark Present access.') });
    } finally {
      setBusyPin(false);
    }
  };

  const changePin = async (event) => {
    event.preventDefault();
    setBusyPin(true);
    setMsg(null);
    try {
      const { data } = await api.post('/classrep/manual-attendance-pin/change', changeForm);
      sessionStorage.removeItem(PIN_TOKEN_KEY);
      setUnlocked(false);
      setChangingPin(false);
      setChangeForm(emptyChangeForm);
      await pinStatus.reload(true);
      setMsg({ kind: 'ok', text: data.message });
    } catch (err) {
      setMsg({ kind: 'error', text: getErrorMessage(err, 'Could not change your PIN.') });
    } finally {
      setBusyPin(false);
    }
  };

  const markPresent = async (student) => {
    if (!window.confirm(`Confirm that ${student.name} (${student.adm}) is physically present in class now.`)) return;
    setBusyAdm(student.adm);
    setMsg(null);
    try {
      const { data } = await api.post('/classrep/manual-attendance', { adm_no: student.adm });
      setMsg({ kind: 'ok', text: data.message });
      await state.reload(true);
    } catch (err) {
      setMsg({ kind: 'error', text: getErrorMessage(err, 'Could not record attendance.') });
      await state.reload(true);
    } finally {
      setBusyAdm('');
    }
  };

  const pinField = (label, value, onChange, name) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
      <input
        name={name}
        type="password"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        autoComplete="off"
        required
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6-digit PIN"
        className={pinInputClass}
      />
    </label>
  );

  return (
    <Page title="Mark present" subtitle="For students without a phone: verify they are in class before recording attendance">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      <Async state={pinStatus}>
        {() => !unlocked ? (
          <Card className="mx-auto max-w-md space-y-4 border-blue-100 shadow-md shadow-blue-950/[0.04]">
            <div>
              <h2 className="text-base font-extrabold text-blue-800">{configured ? 'Unlock Mark Present' : 'Set up your Mark Present PIN'}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {configured ? 'Enter your six-digit PIN to authorize attendance marking for 10 minutes.' : 'Create a six-digit PIN. You will need it each time you open this page.'}
              </p>
            </div>
            <form onSubmit={unlock} className="space-y-3">
              {configured ? (
                pinField('PIN', pin, setPin, 'pin')
              ) : (
                <>
                  {pinField('New PIN', pinForm.pin, (value) => setPinForm((current) => ({ ...current, pin: value })), 'pin')}
                  {pinField('Confirm PIN', pinForm.confirmPin, (value) => setPinForm((current) => ({ ...current, confirmPin: value })), 'confirmPin')}
                </>
              )}
              <Btn type="submit" disabled={busyPin || (configured ? pin.length !== 6 : pinForm.pin.length !== 6 || pinForm.confirmPin.length !== 6)}>
                {busyPin ? 'Please wait…' : configured ? 'Unlock' : 'Set PIN'}
              </Btn>
            </form>
          </Card>
        ) : (
          <>
            {changingPin && (
              <Card className="mb-4 max-w-md space-y-3">
                <h2 className="text-base font-extrabold text-blue-800">Change Mark Present PIN</h2>
                <form onSubmit={changePin} className="space-y-3">
                  {pinField('Current PIN', changeForm.oldPin, (value) => setChangeForm((current) => ({ ...current, oldPin: value })), 'oldPin')}
                  {pinField('New PIN', changeForm.newPin, (value) => setChangeForm((current) => ({ ...current, newPin: value })), 'newPin')}
                  {pinField('Confirm new PIN', changeForm.confirmPin, (value) => setChangeForm((current) => ({ ...current, confirmPin: value })), 'confirmPin')}
                  <div className="flex gap-2">
                    <Btn type="submit" disabled={busyPin || Object.values(changeForm).some((value) => value.length !== 6)}>
                      {busyPin ? 'Please wait…' : 'Change PIN'}
                    </Btn>
                    <Btn type="button" variant="ghost" onClick={() => { setChangingPin(false); setChangeForm(emptyChangeForm); }}>Cancel</Btn>
                  </div>
                </form>
              </Card>
            )}
            <div className="flex justify-end">
              <Btn type="button" variant="ghost" onClick={() => { setChangingPin((value) => !value); setChangeForm(emptyChangeForm); }}>
                {changingPin ? 'Close PIN change' : 'Change PIN'}
              </Btn>
            </div>
            <Async state={state}>
              {(data) => !data.session ? (
                <Notice kind="warn">There is no active class session. Start one from <a href="/rep/generate-qr" className="font-bold underline">Show QR</a> before marking attendance.</Notice>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Active session" value={data.session.unit} hint={`Started ${data.session.startedAt}`} tone="blue" />
                    <Stat label="Present" value={`${students.filter((student) => student.present).length} / ${students.length}`} hint="Includes QR and rep-marked check-ins" tone="green" />
                  </div>
                  <Notice kind="info">Only mark a student after confirming they are physically present. Each student can be recorded once per active session. Manual check-ins are attributed to your rep account.</Notice>
                  <Card className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold text-slate-700">Find a student</span>
                      <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or admission number" className={pinInputClass} />
                    </label>
                    {visibleStudents.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-500">{students.length ? 'No students match your search.' : 'No active students are registered in this class.'}</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {visibleStudents.map((student) => (
                          <div key={student.adm} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-gray-900">{student.name}</p>
                              <p className="text-xs text-gray-500">{student.adm}</p>
                            </div>
                            {student.present ? (
                              <span className="flex items-center gap-2">
                                <Badge tone={student.late ? 'amber' : 'green'}>{student.late ? 'Present · Late' : 'Present'}</Badge>
                                <span className="text-xs text-gray-500">{student.time}{student.method === 'manual' ? ' · rep-marked' : ''}</span>
                              </span>
                            ) : (
                              <Btn type="button" disabled={!!busyAdm} onClick={() => markPresent(student)}>
                                {busyAdm === student.adm ? 'Recording…' : 'Mark present'}
                              </Btn>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </Async>
          </>
        )}
      </Async>
    </Page>
  );
}
