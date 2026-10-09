import crypto from 'crypto';

// Token = base64url(JSON payload) + "." + HMAC-SHA256(payload). The signature stops anyone forging a
// token for another class/session; the timestamp gives the 30 s rotation window.
export const QR_TTL_MS = 30 * 1000;
const LEEWAY_MS = 15 * 1000; // clock drift + time to scan and upload

const secret = () => process.env.QR_SECRET || process.env.JWT_SECRET || 'supersecretmtti2026';
const sign = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

export function generateSecureToken(class_code, rep_id, venue, session_id = Math.floor(Date.now() / 1000), qrLocation) {
  const payload = {
    class_code, rep_id, venue, session_id,
    qr_lat: qrLocation?.latitude,
    qr_lng: qrLocation?.longitude,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(8).toString('hex'),
    gps_required: true, device_lock: true, face_required: true,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { token: `${body}.${sign(body)}`, expiry: new Date(Date.now() + QR_TTL_MS), payload };
}

// ignoreExpiry: used for scans that were queued offline and uploaded later (signature is still checked).
export function verifyToken(token, { ignoreExpiry = false } = {}) {
  try {
    const [body, sig] = String(token || '').trim().split('.');
    if (!body || !sig) return { valid: false, reason: 'Invalid Token Structure.' };
    const expected = sign(body);
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false, reason: 'Invalid QR signature.' };
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!ignoreExpiry && Date.now() - decoded.timestamp > QR_TTL_MS + LEEWAY_MS) {
      return { valid: false, reason: 'Expired Token. Please scan the current active QR.' };
    }
    return { valid: true, data: decoded };
  } catch {
    return { valid: false, reason: 'Invalid Token Structure.' };
  }
}
