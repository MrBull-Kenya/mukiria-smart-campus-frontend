import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import ScannerWithFace from '../../components/QR/ScannerWithFace';
import OfflineSyncBadge from '../../components/Common/OfflineSyncBadge';
import { startQrScanner } from '../../services/qrScanner';
import { parseQrToken, verifyQrToken } from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { getAdmNo } from '../../config/campus';

export default function ScanAttendance() {
  const { user } = useAuth();
  const admNo = getAdmNo(user);

  const videoRef = useRef(null);
  const stopRef = useRef(null);
  const [step, setStep] = useState('idle'); // idle | scanning | selfie | done
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

    // Online: let the server confirm the code is genuine and still fresh (30 s window).
    // Offline: we can't ask, so queue the scan and let the server judge it when it syncs.
    if (navigator.onLine) {
      try {
        await verifyQrToken(text.trim());
      } catch (err) {
        if (!err.isNetworkError) { setError(getErrorMessage(err, 'QR code rejected.')); setStep('idle'); return; }
      }
    }
    setSession({ ...parsed.payload, token: text.trim() });
    setStep('selfie');
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

  return (
    <div className="space-y-6 max-w-md mx-auto p-4">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-gray-900">Secure Attendance Check-in</h2>
          <p className="text-xs text-gray-500">1. Scan the class QR &nbsp;·&nbsp; 2. Selfie &nbsp;·&nbsp; 3. GPS is checked automatically</p>
        </div>

        {error && <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium">{error}</div>}

        {step === 'selfie' && session && (
          <ScannerWithFace
            sessionId={session.session_id}
            qrToken={session.token}
            admNo={admNo}
            classCode={session.class_code}
            onComplete={done}
            onCancel={cancel}
          />
        )}

        {step === 'done' && result && (
          <div className={`p-5 rounded-xl space-y-1 text-center border ${result.queued ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {result.queued ? (
              <>
                <h4 className="text-sm font-bold">Saved offline</h4>
                <p className="text-xs">Your check-in is stored on this phone and will upload automatically when you're back online.</p>
              </>
            ) : (
              <>
                <h4 className="text-sm font-bold">✓ Check-in confirmed{result.is_late ? ' (late)' : ''}</h4>
                <p className="text-xs">+{result.points_earned} punctuality points</p>
              </>
            )}
          </div>
        )}

        {/* The QR viewfinder stays mounted so the camera ref is always valid */}
        <div className={step === 'scanning' ? 'space-y-3' : 'hidden'}>
          <div className="relative bg-gray-900 rounded-2xl aspect-square overflow-hidden">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-white/70 rounded-2xl pointer-events-none" />
          </div>
          <p className="text-center text-xs text-gray-500">Point the camera at the code on the class rep's screen.</p>
          <button onClick={cancel} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs hover:bg-gray-200 transition">Cancel</button>
        </div>

        {(step === 'idle' || step === 'done') && (
          <>
            <button onClick={startScan} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-md shadow-blue-500/20">
              {step === 'done' ? 'Scan another code' : '📷 Scan class QR code'}
            </button>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer font-semibold">Camera not working? Paste the code instead</summary>
              <div className="mt-2 flex gap-2">
                <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste QR text"
                  className="flex-1 min-w-0 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500" />
                <button onClick={() => manual.trim() && acceptToken(manual)} className="bg-gray-800 text-white rounded-lg px-3 text-xs font-bold">Use</button>
              </div>
            </details>
          </>
        )}

        <OfflineSyncBadge />
      </div>
    </div>
  );
}
