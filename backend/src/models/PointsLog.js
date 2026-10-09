import pool from '../config/db.js';

export const PointsLogModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS points_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        points INT NOT NULL,
        activity_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ adm_no, points, activity_type }) {
    const [result] = await pool.query(
      'INSERT INTO points_logs (adm_no, points, activity_type) VALUES (?, ?, ?)',
      [adm_no, points, activity_type]
    );
    return result;
  },

  async getByAdm(adm_no) {
    const [rows] = await pool.query('SELECT * FROM points_logs WHERE adm_no = ?', [adm_no]);
    return rows;
  }
};