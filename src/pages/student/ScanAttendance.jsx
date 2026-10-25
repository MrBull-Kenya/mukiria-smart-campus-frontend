import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import SubmitQrCheckin from '../../components/QR/SubmitQrCheckin';
import OfflineSyncBadge from '../../components/Common/OfflineSyncBadge';
import { startQrScanner } from '../../services/qrScanner';
import { parseQrToken, verifyQrToken } from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { getAdmNo } from '../../config/campus';
import { Page, Badge, Btn, Card, Notice } from '../../components/ui';

export default function ScanAttendance() {
  const { user } = useAuth();
  const admNo = getAdmNo(user);

  const videoRef = useRef(null);
  const stopRef = useRef(null);
  const [step, setStep] = useState('idle'); // idle | scanning | checkin | done
  const [session, setSession] = useState(null);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const stopScanner = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);
  useEffect(() => stopScanner, [stopScanner]);

  const acceptToken = useCallback(async (text) => {
    stopScanner();
    setError('');
    const parsed = parseQrToken(text);
    if (!parsed.ok) { setError(parsed.reason); setStep('idle'); return; }

    const qrClass = parsed.payload.class_code;
    if (user?.class_code && qrClass && user.class_code.trim().toLowerCase() !== String(qrClass).trim().toLowerCase()) {
      setError(`This QR is for class ${qrClass}, but you are enrolled in ${user.class_code}.`);
      setStep('idle');
      return;
    }

    if (!navigator.onLine) {
      setError('QR attendance requires an internet connection. Reconnect and scan the current QR code.');
      setStep('idle');
      return;
    }
    try {
      await verifyQrToken(text.trim());
    } catch (err) {
      setError(getErrorMessage(err, 'QR code rejected.'));
      setStep('idle');
      return;
    }
    setSession({ ...parsed.payload, token: text.trim() });
    setStep('checkin');
  }, [user, stopScanner]);

  const startScan = async () => {
    setError('');
    setResult(null);
    setStep('scanning');
    try {
      stopRef.current = await startQrScanner(videoRef.current, acceptToken);
    } catch {
      setStep('idle');
      setError('Could not open the camera. Allow camera access (needs HTTPS or localhost), or paste the code below.');
    }
  };

  const cancel = () => { stopScanner(); setSession(null); setStep('idle'); };
  const done = (res) => { setResult(res); setStep('done'); };
  const stepLabel = {
    idle: 'Ready to scan',
    scanning: 'Scan the class QR',
    checkin: 'Verify your attendance',
    done: 'Attendance recorded',
  }[step];

  return (
    <Page title="Scan attendance" subtitle="Check in to your active lesson using the class representative's secure QR code">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <Card className="overflow-hidden border-blue-100 p-0 shadow-md shadow-blue-950/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3m8 0h3a1 1 0 011 1v3m0 8v3a1 1 0 01-1 1h-3m-8 0H5a1 1 0 01-1-1v-3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h3v3H8zm5 0h3v3h-3zm-5 5h3v3H8zm6 0v1m2 0v2m-3 0h1" />
                </svg>
              </span>
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Secure lesson check-in</h2>
                <p className="mt-1 text-xs text-slate-600">{stepLabel}</p>
              </div>
            </div>
            <Badge tone={step === 'done' ? 'green' : step === 'checkin' ? 'amber' : 'blue'}>
              {step === 'scanning' ? 'Camera active' : step === 'checkin' ? 'Verification' : step === 'done' ? 'Complete' : 'Secure check-in'}
            </Badge>
          </div>

          {step === 'checkin' && session && (
            <div className="p-5 sm:p-6">
              <SubmitQrCheckin
                sessionId={session.session_id}
                qrToken={session.token}
                admNo={admNo}
                onComplete={done}
                onCancel={cancel}
              />
            </div>
          )}

        {step === 'done' && result && (
          <div role="status" className="mx-5 mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800 sm:mx-6">
            <span aria-hidden="true" className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-xl font-black text-white">✓</span>
            <h4 className="mt-3 text-sm font-extrabold">Check-in confirmed{result.is_late ? ' · Late' : ''}</h4>
            <p className="mt-1 text-xs">+{result.points_earned} punctuality points</p>
            {Number.isFinite(Number(result.rep_distance_m)) && (
              <p className="mt-2 text-xs">Estimated distance from the class representative: {result.rep_distance_m} m (GPS estimate).</p>
            )}
          </div>
        )}

          <div className="space-y-4 p-5 sm:p-6">
            {error && <Notice kind="error">{error}</Notice>}

            {/* Keep the camera element mounted so the scanner can always attach to its video ref. */}
            <div className={step === 'scanning' ? 'space-y-3' : 'hidden'}>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-950">
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.22)]" />
              </div>
              <p className="text-center text-xs text-slate-500">Hold your phone steady and point the camera at the current QR code shown by your class rep.</p>
              <Btn type="button" variant="ghost" onClick={cancel} className="w-full min-h-11">Cancel scan</Btn>
            </div>

            {(step === 'idle' || step === 'done') && (
              <div className="space-y-4">
                <Btn type="button" onClick={startScan} className="w-full min-h-12 text-sm">
                  {step === 'done' ? 'Scan another code' : 'Open camera to scan'}
                </Btn>
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  <summary className="cursor-pointer font-bold text-slate-700">Camera unavailable? Enter QR code manually</summary>
                  <div className="mt-3 flex gap-2">
                    <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste QR text" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
                    <Btn type="button" variant="ghost" disabled={!manual.trim()} onClick={() => acceptToken(manual)}>Verify</Btn>
                  </div>
                </details>
                <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-slate-800">1 · Scan</strong>Use the live class QR.</div>
                  <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-slate-800">2 · Verify</strong>Use your passkey if enrolled.</div>
                  <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-slate-800">3 · Check in</strong>Stay online and allow location.</div>
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
            <p className="text-[11px] leading-5 text-slate-500">Attendance requires an active session, internet access, and location permission. Your check-in is confirmed only after the server verifies it.</p>
          </div>
        </Card>

        <OfflineSyncBadge />
      </div>
    </Page>
  );
}
