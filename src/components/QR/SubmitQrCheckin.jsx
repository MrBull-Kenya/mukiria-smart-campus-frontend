import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentPosition, distanceFromCampus } from '../../services/geolocation';
import { submitScan } from '../../services/attendance';
import { saveScanOffline } from '../../services/offlineDB';
import { getErrorMessage } from '../../services/api';
import { CAMPUS } from '../../config/campus';

/**
 * Submit a verified QR check-in with the device's current GPS location.
 * If offline, queue the scan for upload when a connection returns.
 */
export default function SubmitQrCheckin({ sessionId, qrToken, admNo, onComplete, onCancel }) {
  const { deviceId } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState({ kind: 'info', text: 'The QR code is ready. Confirm to check in using this device’s location.' });

  const queueOffline = async (fields) => {
    await saveScanOffline({ fields });
    onComplete({ queued: true });
  };

  const handleCheckin = async () => {
    if (busy) return;
    setBusy(true);
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
      qr_token: qrToken, // the server verifies the signature (and freshness, except for offline replays)
      scanned_at: Date.now(), // used only when this scan is queued offline and uploaded later
    };

    if (!navigator.onLine) {
      await queueOffline(fields);
      return;
    }

    setNote({ kind: 'info', text: 'Uploading check-in…' });
    try {
      const res = await submitScan(fields);
      onComplete({ queued: false, ...res.data });
    } catch (err) {
      if (err.isNetworkError) {
        await queueOffline(fields);
        return;
      }
      let text = getErrorMessage(err, 'Check-in failed.');
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
