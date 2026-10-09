import pool from '../config/db.js';

export const AttendanceLogModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        adm_no VARCHAR(50) NOT NULL,
        photo_url VARCHAR(255),
        gps_lat DECIMAL(10,8),
        gps_lng DECIMAL(11,8),
        is_late BOOLEAN DEFAULT FALSE,
        is_offline_synced BOOLEAN DEFAULT FALSE,
        device_id VARCHAR(255),
        points_earned INT DEFAULT 0,
        record_method VARCHAR(20) NOT NULL DEFAULT 'qr',
        recorded_by INT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ session_id, adm_no, photo_url, gps_lat, gps_lng, is_late, is_offline_synced, device_id, points_earned, record_method, recorded_by }) {
    const [result] = await pool.query(
      'INSERT INTO attendance_logs (session_id, adm_no, photo_url, gps_lat, gps_lng, is_late, is_offline_synced, device_id, points_earned, record_method, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [session_id, adm_no, photo_url || null, gps_lat || null, gps_lng || null, is_late || false, is_offline_synced || false, device_id || null, points_earned || 0, record_method || 'qr', recorded_by || null]
    );
    return result;
  },

  async getByAdm(adm_no) {
    const [rows] = await pool.query('SELECT * FROM attendance_logs WHERE adm_no = ?', [adm_no]);
    return rows;
  }
};