import { pool } from '../config/db.js';

export const sessionController = {
  async getLiveAttendance(req, res) {
    try {
      const { sessionId } = req.params;

      // Fetch real-time attendance records joined with student details
      const [rows] = await pool.query(
        `SELECT al.id, al.adm_no, s.name, s.class_code, al.is_late, al.points_earned, al.created_at, al.photo_url
         FROM attendance_logs al
         JOIN students s ON al.adm_no = s.adm_no
         WHERE al.session_id = ?
         ORDER BY al.created_at DESC`,
        [sessionId]
      );

      res.json({
        success: true,
        total_present: rows.length,
        attendees: rows
      });
    } catch (err) {
      console.error('Live attendance fetch error:', err);
      res.status(500).json({ error: 'Failed to fetch live attendance records.' });
    }
  }
};