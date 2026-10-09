import { pool } from '../config/db.js';

export const leaderboardController = {
  async getLeaderboard(req, res) {
    try {
      const [rows] = await pool.query(
        `SELECT adm_no, name, class_code, total_points, attendance_rate
         FROM students
         ORDER BY total_points DESC, attendance_rate DESC
         LIMIT 50`
      );

      res.json({
        success: true,
        leaderboard: rows
      });
    } catch (err) {
      console.error('Leaderboard error:', err);
      res.status(500).json({ error: 'Failed to fetch student leaderboard.' });
    }
  }
};