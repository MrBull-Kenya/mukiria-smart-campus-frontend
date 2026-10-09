import { calculateDistance, QR_SCAN_RADIUS_METERS, verifyGeofence } from '../config/mttiGPS.js';
import { verifyToken as verifyQr } from '../utils/qrGenerator.js';
import { DeviceLockModel } from '../models/DeviceLock.js';
import { one, q, exec, sqlDate, asDate, pct1 } from '../utils/dbHelpers.js';

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
      const { session_id, gps_lat, gps_lng, device_id, qr_token, is_offline_synced, scanned_at } = req.body;
      const offline = String(is_offline_synced) === 'true';

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
      if (!session.is_active && !offline) return res.status(400).json({ error: 'This class session has ended.' });
      if (session.class_code !== student.class_code) {
        return res.status(403).json({ error: `This session is for class ${session.class_code}, not ${student.class_code}.` });
      }

      // 3. QR token: genuine (HMAC), for this session, and fresh (offline replays skip only the freshness check)
      const v = verifyQr(qr_token, { ignoreExpiry: offline });
      if (!v.valid) return res.status(400).json({ error: v.reason });
      if (Number(v.data.session_id) !== Number(session.id)) return res.status(400).json({ error: 'QR code does not match this session.' });

      // 4. Geofence (FEAT 3)
      const geofence = verifyGeofence(parseFloat(gps_lat), parseFloat(gps_lng));
      if (Number.isNaN(geofence.distanceMeters)) return res.status(400).json({ error: 'GPS coordinates are required.' });
      if (!geofence.isWithinCampus) {
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

      // 7. Late threshold (FEAT 4). Offline scans use the time the student actually scanned, clamped to [start, now].
      let when = new Date();
      if (offline && scanned_at) {
        const t = new Date(Number(scanned_at) || scanned_at);
        if (!Number.isNaN(t.getTime())) when = new Date(Math.min(Math.max(t.getTime(), asDate(session.start_time).getTime()), Date.now()));
      }
      const minsIn = (when - asDate(session.start_time)) / 60000;
      const is_late = minsIn > (session.late_threshold_mins || 15);
      const points_earned = is_late ? POINTS_LATE : POINTS_ON_TIME;

      const photo_url = req.file ? req.file.path.replace(/\\/g, '/') : null;
      const log = await exec(
        `INSERT INTO attendance_logs (session_id, adm_no, photo_url, gps_lat, gps_lng, is_late, is_offline_synced, device_id, points_earned, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [session.id, student.adm_no, photo_url, gps_lat, gps_lng, is_late ? 1 : 0, offline ? 1 : 0, device_id || null, points_earned, sqlDate(when)]
      );

      await exec('UPDATE students SET points = points + ? WHERE adm_no = ?', [points_earned, student.adm_no]);
      await exec('INSERT INTO points_logs (adm_no, points, activity_type) VALUES (?, ?, ?)', [student.adm_no, points_earned, is_late ? 'Late attendance' : 'On-time attendance']);
      await recomputeAttendance(student.adm_no, session.class_code);
      await awardBadges(student.adm_no);

      req.app.get('io')?.to(session.class_code).emit('attendance_update', { class_code: session.class_code, adm_no: student.adm_no, name: student.name, is_late });
      res.status(201).json({ message: 'Attendance recorded successfully.', is_late, points_earned, logId: log.insertId });
    } catch (err) {
      console.error('Attendance scan error:', err);
      res.status(500).json({ error: 'Failed to log attendance.' });
    }
  },
};
