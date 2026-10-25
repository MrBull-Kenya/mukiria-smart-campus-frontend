import { calculateDistance, QR_SCAN_RADIUS_METERS, verifyGeofence } from '../config/mttiGPS.js';
import pool from '../config/db.js';
import { verifyToken as verifyQr } from '../utils/qrGenerator.js';
import { DeviceLockModel } from '../models/DeviceLock.js';
import { one, q, exec, sqlDate, asDate, pct1 } from '../utils/dbHelpers.js';
import { passkeyController } from './passkeyController.js';
import { activeActingRepById } from '../utils/actingRep.js';

export const POINTS_ON_TIME = 15;
export const POINTS_LATE = 5;

// attendance % = distinct sessions attended / sessions the student's class has held so far
export async function recomputeAttendance(adm_no, class_code) {
  const total = (await one('SELECT COUNT(*) AS n FROM sessions WHERE class_code = ?', [class_code])).n;
  const attended = (await one(
    'SELECT COUNT(DISTINCT l.session_id) AS n FROM attendance_logs l JOIN sessions s ON s.id = l.session_id WHERE l.adm_no = ? AND s.class_code = ?',
    [adm_no, class_code]
  )).n;
  const pct = total ? Math.min(100, pct1(attended, total)) : 100;
  await exec('UPDATE students SET attendance_pct = ? WHERE adm_no = ?', [pct, adm_no]);
  return pct;
}

export async function recomputeClassAttendance(class_code) {
  const rows = await q('SELECT s.adm_no FROM students s JOIN users u ON u.id = s.user_id WHERE u.class_code = ?', [class_code]);
  for (const r of rows) await recomputeAttendance(r.adm_no, class_code);
}

export async function awardBadges(adm_no) {
  const logs = await q('SELECT is_late FROM attendance_logs WHERE adm_no = ?', [adm_no]);
  const has = async (name) => !!(await one('SELECT id FROM badges WHERE adm_no = ? AND badge_name = ?', [adm_no, name]));
  const give = async (name) => { if (!(await has(name))) await exec('INSERT INTO badges (adm_no, badge_name) VALUES (?, ?)', [adm_no, name]); };
  if (logs.length >= 1) await give('First Check-in');
  if (logs.filter((l) => !l.is_late).length >= 10) await give('Punctual 10');
}

export const attendanceController = {
  async scanAttendance(req, res) {
    try {
      const { session_id, gps_lat, gps_lng, device_id, qr_token, is_offline_synced } = req.body;
      if (String(is_offline_synced) === 'true') {
        return res.status(403).json({ error: 'Offline scans cannot be verified as biometric attendance. Please scan the current QR and verify your passkey while online.' });
      }

      // 1. Who is scanning: the signed-in student (never trust a client-supplied admission number)
      const student = await one(
        'SELECT s.*, u.class_code, u.name FROM students s JOIN users u ON u.id = s.user_id WHERE s.user_id = ?',
        [req.user.id]
      );
      if (!student) return res.status(403).json({ error: 'No student record is linked to this account.' });
      if (req.body.adm_no && req.body.adm_no !== student.adm_no) {
        return res.status(403).json({ error: 'Admission number does not match the signed-in account.' });
      }

      // 2. Session must exist, be live and belong to the student's class
      const session = await one('SELECT * FROM sessions WHERE id = ?', [session_id]);
      if (!session) return res.status(404).json({ error: 'Unknown class session.' });
      if (!session.is_active) return res.status(400).json({ error: 'This class session has ended.' });
      if (session.class_code !== student.class_code) {
        return res.status(403).json({ error: `This session is for class ${session.class_code}, not ${student.class_code}.` });
      }

      // 3. QR token: genuine (HMAC), for this session, and fresh.
      const v = verifyQr(qr_token);
      if (!v.valid) return res.status(400).json({ error: v.reason });
      if (Number(v.data.session_id) !== Number(session.id)) return res.status(400).json({ error: 'QR code does not match this session.' });
      if (v.data.acting_assignment_id && !(await activeActingRepById(v.data.acting_assignment_id, session.id))) {
        return res.status(403).json({ error: 'This Acting Rep appointment has expired or been revoked.' });
      }

      // 4. Geofence (FEAT 3)
      const geofence = verifyGeofence(parseFloat(gps_lat), parseFloat(gps_lng));
      if (Number.isNaN(geofence.distanceMeters)) return res.status(400).json({ error: 'GPS coordinates are required.' });
      if (req.user.role !== 'student_rep' && !geofence.isWithinCampus) {
        return res.status(403).json({ error: `Check-in rejected. Outside MTTI campus perimeter (${geofence.distanceMeters} m from centre).` });
      }

      const qrLat = Number(v.data.qr_lat);
      const qrLng = Number(v.data.qr_lng);
      if (!Number.isFinite(qrLat) || qrLat < -90 || qrLat > 90 || !Number.isFinite(qrLng) || qrLng < -180 || qrLng > 180) {
        return res.status(400).json({ error: 'This QR has no valid location data. Ask the class representative to refresh it.' });
      }
      const qrDistance = calculateDistance(parseFloat(gps_lat), parseFloat(gps_lng), qrLat, qrLng);
      if (qrDistance > QR_SCAN_RADIUS_METERS) {
        return res.status(403).json({ error: `Check-in rejected. You must be within ${QR_SCAN_RADIUS_METERS} m of the class representative (${Math.round(qrDistance)} m away).` });
      }

      // 5. Device binding (FEAT 2): first device registers itself, later devices must match
      if (device_id) {
        const lock = await DeviceLockModel.findByAdm(student.adm_no);
        if (!lock) await DeviceLockModel.registerDevice(student.adm_no, device_id);
        else if (lock.device_fingerprint !== device_id) {
          return res.status(403).json({ error: 'Security Policy Violation: this is not your registered device. Ask your class rep or HOD to reset it.' });
        }
      }

      // 6. One check-in per session
      if (await one('SELECT id FROM attendance_logs WHERE session_id = ? AND adm_no = ?', [session.id, student.adm_no])) {
        return res.status(409).json({ error: 'You have already checked in for this session.' });
      }

      const [[credential]] = await pool.query(
        'SELECT credential_hash FROM passkey_credentials WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );
      if (credential) {
        if (!req.body.passkey_challenge || !req.body.passkey_response) {
          return res.status(403).json({ error: 'Verify your enrolled passkey to record attendance.' });
        }
        let passkeyResponse;
        try {
          passkeyResponse = JSON.parse(req.body.passkey_response);
        } catch {
          return res.status(400).json({ error: 'The biometric response is invalid. Please verify your passkey again.' });
        }
        const biometric = await passkeyController.verifyAttendance({
          userId: req.user.id,
          challenge: req.body.passkey_challenge,
          response: passkeyResponse,
          sessionId: Number(session.id),
          qrToken: qr_token,
          latitude: Number(gps_lat),
          longitude: Number(gps_lng),
          deviceId: device_id,
        });
        if (!biometric.ok) return res.status(biometric.status).json({ error: biometric.error });
      } else if (req.body.passkey_challenge || req.body.passkey_response) {
        return res.status(400).json({ error: 'No passkey is enrolled on this account. Scan the current QR and try again.' });
      }

      // 7. Late threshold (FEAT 4).
      let when = new Date();
      const minsIn = (when - asDate(session.start_time)) / 60000;
      const is_late = minsIn > (session.late_threshold_mins || 15);
      const points_earned = is_late ? POINTS_LATE : POINTS_ON_TIME;

      const photo_url = req.file ? req.file.path.replace(/\\/g, '/') : null;
      const log = await exec(
        `INSERT INTO attendance_logs (session_id, adm_no, photo_url, gps_lat, gps_lng, rep_distance_m, is_late, is_offline_synced, device_id, points_earned, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [session.id, student.adm_no, photo_url, gps_lat, gps_lng, Math.round(qrDistance), is_late ? 1 : 0, 0, device_id || null, points_earned, sqlDate(when)]
      );

      await exec('UPDATE students SET points = points + ? WHERE adm_no = ?', [points_earned, student.adm_no]);
      await exec('INSERT INTO points_logs (adm_no, points, activity_type) VALUES (?, ?, ?)', [student.adm_no, points_earned, is_late ? 'Late attendance' : 'On-time attendance']);
      await recomputeAttendance(student.adm_no, session.class_code);
      await awardBadges(student.adm_no);

      req.app.get('io')?.to(session.class_code).emit('attendance_update', { class_code: session.class_code, adm_no: student.adm_no, name: student.name, is_late });
      res.status(201).json({ message: 'Attendance recorded successfully.', is_late, points_earned, rep_distance_m: Math.round(qrDistance), logId: log.insertId });
    } catch (err) {
      console.error('Attendance scan error:', err);
      res.status(500).json({ error: 'Failed to log attendance.' });
    }
  },
};
