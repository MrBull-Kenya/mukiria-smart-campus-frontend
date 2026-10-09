import pool from '../config/db.js';

export const TempIDRequestModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS temp_id_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        face_score DECIMAL(5,2) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ adm_no, face_score, status, expires_at }) {
    const [result] = await pool.query(
      'INSERT INTO temp_id_requests (adm_no, face_score, status, expires_at) VALUES (?, ?, ?, ?)',
      [adm_no, face_score, status || 'pending', expires_at]
    );
    return result;
  },

  async updateStatus(id, status) {
    await pool.query('UPDATE temp_id_requests SET status = ? WHERE id = ?', [status, id]);
  }
};