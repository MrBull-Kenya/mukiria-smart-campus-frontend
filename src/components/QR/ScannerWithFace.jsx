import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaceCaptureService } from '../../services/faceCapture';
import { getCurrentPosition, distanceFromCampus } from '../../services/geolocation';
import { submitScan, dataUrlToBlob } from '../../services/attendance';
import { saveScanOffline } from '../../services/offlineDB';
import { getErrorMessage } from '../../services/api';
import { CAMPUS } from '../../config/campus';

/**
 * Step 2 of check-in: take a selfie, read GPS, then upload to POST /attendance/scan.
 * If the phone is offline (or the server can't be reached) the scan is queued in IndexedDB
 * and uploaded automatically later (see hooks/useOfflineSync.js).
 */
export default function ScannerWithFace({ sessionId, qrToken, admNo, classCode, onComplete, onCancel }) {
  const { deviceId } = useAuth();
  const videoRef = useRef(null);
  const faceRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState({ kind: 'info', text: 'Starting front camera…' });

  useEffect(() => {
    let cancelled = false;
    const svc = new FaceCaptureService(videoRef.current);
    faceRef.current = svc;
    svc
      .startCamera()
      .then(() => {
        if (cancelled) return svc.stopCamera();
        setCameraOn(true);
        setNote({ kind: 'info', text: 'Centre your face in the frame, then tap "Take selfie & check in".' });
      })
      .catch((e) => !cancelled && setNote({ kind: 'error', text: e.message }));
    return () => { cancelled = true; svc.stopCamera(); };
  }, []);

  const queueOffline = async (fields, photoDataUrl) => {
    await saveScanOffline({ fields, photoDataUrl });
    faceRef.current?.stopCamera();
    onComplete({ queued: true });
  };

  const handleCapture = async () => {
    if (!cameraOn || busy) return;
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

    let photoDataUrl;
    try {
      photoDataUrl = faceRef.current.captureFrame();
    } catch (e) {
      setNote({ kind: 'error', text: e.message });
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
      await queueOffline(fields, photoDataUrl);
      return;
    }

    setNote({ kind: 'info', text: 'Uploading check-in…' });
    try {
      const res = await submitScan(fields, dataUrlToBlob(photoDataUrl));
      faceRef.current?.stopCamera();
      onComplete({ queued: false, ...res.data });
    } catch (err) {
      if (err.isNetworkError) {
        await queueOffline(fields, photoDataUrl); // server unreachable: keep the scan, sync later
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
      <div className="relative overflow-hidden rounded-2xl bg-black aspect-[4/3] flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
        {!cameraOn && <span className="absolute text-white text-xs font-medium">Camera inactive</span>}
      </div>
      <p className={`p-3 rounded-xl border text-xs font-semibold text-center ${tone}`}>{note.text}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={busy} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold text-xs hover:bg-gray-200 disabled:opacity-50 transition">
          Cancel
        </button>
        <button onClick={handleCapture} disabled={!cameraOn || busy} className="flex-[2] bg-blue-600 text-white py-3 rounded-xl font-bold text-xs hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20">
          {busy ? 'Working…' : 'Take selfie & check in'}
        </button>
      </div>
    </div>
  );
}
