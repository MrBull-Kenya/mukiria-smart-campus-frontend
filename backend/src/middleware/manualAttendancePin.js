import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const requiredPinToken = (res) => res.status(403).json({
  code: 'MANUAL_ATTENDANCE_PIN_REQUIRED',
  error: 'Unlock Mark Present with your six-digit PIN.',
});

export async function requireManualAttendancePin(req, res, next) {
  const token = req.get('X-Manual-Attendance-Token');
  if (!token) return requiredPinToken(res);

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET || 'supersecretmtti2026');
  } catch {
    return requiredPinToken(res);
  }

  if (claims.scope !== 'manual-attendance' || String(claims.id) !== String(req.user.id)) {
    return requiredPinToken(res);
  }

  try {
    const [rows] = await pool.query(
      'SELECT manual_attendance_pin_hash, manual_attendance_pin_version FROM users WHERE id = ?',
      [req.user.id]
    );
    const user = rows[0];
    if (!user?.manual_attendance_pin_hash || Number(user.manual_attendance_pin_version) !== Number(claims.pinVersion)) {
      return requiredPinToken(res);
    }
    next();
  } catch (err) {
    console.error('Manual attendance PIN authorization failed:', err);
    res.status(500).json({ error: 'Could not verify Mark Present access.' });
  }
}
