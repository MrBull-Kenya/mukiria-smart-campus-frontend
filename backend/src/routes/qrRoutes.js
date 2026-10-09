import express from 'express';
import crypto from 'node:crypto';
import { generateSecureToken, QR_TTL_MS, verifyToken } from '../utils/qrGenerator.js';
import { requireRole } from '../middleware/authMiddleware.js';
import { one } from '../utils/dbHelpers.js';
import { QR_SCAN_RADIUS_METERS } from '../config/mttiGPS.js';
import { allow } from '../utils/rateLimit.js';

const router = express.Router();
const repCodes = new Map();
const REP_CODE_TTL_MS = QR_TTL_MS + 15_000;

function issueRepCode(userId, sessionId, token) {
  const now = Date.now();
  for (const [code, entry] of repCodes) if (entry.expiresAt <= now) repCodes.delete(code);
  let code;
  do { code = String(crypto.randomInt(0, 100_000_000)).padStart(8, '0'); } while (repCodes.has(code));
  repCodes.set(code, { userId, sessionId: Number(sessionId), token, expiresAt: now + REP_CODE_TTL_MS });
  return code;
}

// POST /api/qr/generate  (class rep) -> signed rotating token for the rep's ACTIVE session
router.post('/generate', requireRole('student_rep', 'admin'), async (req, res) => {
  try {
    const { session_id, venue } = req.body;
    if (!session_id) return res.status(400).json({ success: false, message: 'session_id is required. Start a session first.' });

    const qrLat = Number.parseFloat(req.body.gps_lat);
    const qrLng = Number.parseFloat(req.body.gps_lng);
    if (!Number.isFinite(qrLat) || qrLat < -90 || qrLat > 90 || !Number.isFinite(qrLng) || qrLng < -180 || qrLng > 180) {
      return res.status(400).json({ success: false, message: 'Enable location and provide valid GPS coordinates to generate the QR code.' });
    }

    const session = await one('SELECT * FROM sessions WHERE id = ?', [session_id]);
    if (!session || !session.is_active) return res.status(404).json({ success: false, message: 'This session is not active.' });
    if (req.user.role !== 'admin' && session.class_code !== req.user.class_code) {
      return res.status(403).json({ success: false, message: 'This session belongs to another class.' });
    }

    const rep_id = req.user.adm_no || req.user.id;
    const result = generateSecureToken(
      session.class_code,
      rep_id,
      venue || session.venue || 'Lecture room',
      session.id,
      { latitude: qrLat, longitude: qrLng }
    );
    const rep_checkin_code = req.user.role === 'student_rep'
      ? issueRepCode(req.user.id, session.id, result.token)
      : undefined;
    res.json({ success: true, ...result, ...(rep_checkin_code ? { rep_checkin_code } : {}) });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during QR generation.' });
  }
});

// POST /api/qr/rep-code/verify -> resolve the rep's short-lived code for their own check-in only.
router.post('/rep-code/verify', requireRole('student_rep'), async (req, res) => {
  try {
    if (!allow(`rep-checkin-code:${req.user.id}`, 6, 60_000)) {
      return res.status(429).json({ success: false, message: 'Too many code attempts. Wait a minute and try again.' });
    }
    const code = String(req.body.code || '').trim();
    if (!/^\d{8}$/.test(code)) return res.status(400).json({ success: false, message: 'Enter the 8-digit code shown beside your class QR.' });
    const entry = repCodes.get(code);
    if (!entry || entry.expiresAt <= Date.now() || entry.userId !== req.user.id) {
      if (entry?.expiresAt <= Date.now()) repCodes.delete(code);
      return res.status(400).json({ success: false, message: 'That code is invalid or expired. Use the current code on your QR screen.' });
    }
    const verified = verifyToken(entry.token);
    if (!verified.valid || Number(verified.data.session_id) !== entry.sessionId) {
      repCodes.delete(code);
      return res.status(400).json({ success: false, message: 'That code is invalid or expired. Use the current code on your QR screen.' });
    }
    const session = await one('SELECT id, class_code, is_active FROM sessions WHERE id = ?', [entry.sessionId]);
    if (!session || !session.is_active || session.class_code !== req.user.class_code) {
      repCodes.delete(code);
      return res.status(400).json({ success: false, message: 'This class session has ended.' });
    }
    const fresh = generateSecureToken(
      session.class_code,
      req.user.adm_no || req.user.id,
      verified.data.venue || 'Lecture room',
      session.id,
      { latitude: Number(verified.data.qr_lat), longitude: Number(verified.data.qr_lng) }
    );
    res.json({ success: true, token: fresh.token, data: fresh.payload });
  } catch (err) {
    console.error('Rep attendance code verification error:', err);
    res.status(500).json({ success: false, message: 'Could not verify the attendance code.' });
  }
});

// POST /api/qr/verify  (any signed-in user) -> is this scanned code genuine, fresh, and for a live session?
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required for verification.' });
    const v = verifyToken(token);
    if (!v.valid) return res.status(400).json({ success: false, message: v.reason });
    if (!Number.isFinite(Number(v.data.qr_lat)) || !Number.isFinite(Number(v.data.qr_lng))) {
      return res.status(400).json({ success: false, message: 'This QR has no location data. Ask the class representative to refresh it.' });
    }

    const session = await one('SELECT id, is_active FROM sessions WHERE id = ?', [v.data.session_id]);
    if (!session || !session.is_active) return res.status(400).json({ success: false, message: 'This class session has ended.' });
    res.json({ success: true, message: `QR token verified. Students must be within ${QR_SCAN_RADIUS_METERS} m of the QR location.`, data: v.data });
  } catch (err) {
    console.error('QR verification error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during verification.' });
  }
});

export default router;
