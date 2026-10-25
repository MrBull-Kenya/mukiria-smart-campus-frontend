import React, { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../../context/AuthContext';
import { getCurrentPosition, distanceFromCampus } from '../../services/geolocation';
import { getAttendancePasskeyOptions, submitScan } from '../../services/attendance';
import { getErrorMessage } from '../../services/api';
import { CAMPUS } from '../../config/campus';

/**
 * Submit a verified QR check-in with current GPS location and a passkey when one is enrolled.
 */
export default function SubmitQrCheckin({ sessionId, qrToken, admNo, onComplete, onCancel }) {
  const { deviceId } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState({ kind: 'info', text: 'Check in online using this device’s location. Your enrolled passkey will be used when available.' });

  const handleCheckin = async () => {
    if (busy) return;
    setBusy(true);
    if (!navigator.onLine) {
      setNote({ kind: 'error', text: 'QR attendance requires an internet connection. Reconnect and scan the current QR code.' });
      setBusy(false);
      return;
    }
    setNote({ kind: 'info', text: 'Reading your location…' });

    let pos;
    try {
      pos = await getCurrentPosition();
    } catch {
      setNote({ kind: 'error', text: 'Location unavailable. Turn on GPS / allow location for this site and try again.' });
      setBusy(false);
      return;
    }

    const fields = {
      session_id: sessionId,
      adm_no: admNo,
      gps_lat: pos.latitude,
      gps_lng: pos.longitude,
      device_id: deviceId,
      qr_token: qrToken,
    };

    try {
      setNote({ kind: 'info', text: 'Checking your passkey setup…' });
      const { data: challengeData } = await getAttendancePasskeyOptions(fields);
      let passkeyResponse;
      if (challengeData.passkeyAvailable) {
        setNote({ kind: 'info', text: 'Confirm your identity with your device passkey…' });
        passkeyResponse = await startAuthentication({ optionsJSON: challengeData.options });
      } else {
        setNote({ kind: 'info', text: 'No passkey is enrolled; completing check-in with your QR code and location…' });
      }
      if (!navigator.onLine) {
        setNote({ kind: 'error', text: 'You went offline before verification completed. No check-in was recorded. Reconnect and scan the current QR again.' });
        setBusy(false);
        return;
      }
      const res = await submitScan({
        ...fields,
        ...(passkeyResponse ? {
          passkey_challenge: challengeData.options.challenge,
          passkey_response: passkeyResponse,
        } : {}),
      });
      onComplete(res.data);
    } catch (err) {
      let text = err?.name === 'NotAllowedError'
        ? 'Passkey verification was cancelled or timed out. Scan the current QR and try again.'
        : getErrorMessage(err, 'Check-in failed.');
      if (err.response?.status === 403 && /perimeter|geofence/i.test(text)) {
        text += ` (Your phone puts you ${distanceFromCampus(pos.latitude, pos.longitude)} m from the campus centre; limit is ${CAMPUS.radiusMeters} m.)`;
      }
      setNote({ kind: 'error', text });
      setBusy(false);
    }
  };

  const tone = note.kind === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-gray-50 border-gray-200 text-blue-700';

  return (
    <div className="space-y-4">
      <p className={`p-3 rounded-xl border text-xs font-semibold text-center ${tone}`}>{note.text}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={busy} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs hover:bg-gray-200 disabled:opacity-50 transition">
          Cancel
        </button>
        <button onClick={handleCheckin} disabled={busy} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20">
          {busy ? 'Checking in…' : 'Check in with QR code'}
        </button>
      </div>
    </div>
  );
}
