import api from './api';

// QR tokens are "base64url(JSON).signature" (backend/src/utils/qrGenerator.js). The phone only decodes the
// payload to show which class it is for; the SERVER verifies the signature and the 30 s freshness window.
export function parseQrToken(text) {
  try {
    const body = String(text).trim().split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || payload.session_id === undefined || !payload.class_code) {
      return { ok: false, reason: 'This QR code is not an MTTI attendance code.' };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, reason: 'This QR code is not an MTTI attendance code.' };
  }
}

// Server-side check of signature/expiry (30 s window). Uses the server clock, not the phone's.
export const verifyQrToken = (token) => api.post('/qr/verify', { token });

export function dataUrlToBlob(dataUrl) {
  const [head, body] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * POST /attendance/scan expects multipart/form-data:
 *   text fields: session_id, adm_no, gps_lat, gps_lng, device_id   file field: "photo"
 * (see backend/src/routes/attendanceRoutes.js -> uploadFace.single('photo'))
 */
export function submitScan(fields, photoBlob) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });
  if (photoBlob) fd.append('photo', photoBlob, 'selfie.jpg');
  return api.post('/attendance/scan', fd);
}
