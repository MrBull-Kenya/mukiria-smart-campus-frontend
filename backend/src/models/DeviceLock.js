import pool from '../config/db.js';

export const DeviceLockModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS device_locks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adm_no VARCHAR(50) UNIQUE NOT NULL,
        device_fingerprint VARCHAR(255) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async registerDevice(adm_no, device_fingerprint) {
    const [result] = await pool.query(
      'INSERT INTO device_locks (adm_no, device_fingerprint) VALUES (?, ?) ON DUPLICATE KEY UPDATE device_fingerprint = ?',
      [adm_no, device_fingerprint, device_fingerprint]
    );
    return result;
  },

  async findByAdm(adm_no) {
    const [rows] = await pool.query('SELECT * FROM device_locks WHERE adm_no = ?', [adm_no]);
    return rows[0];
  }
};