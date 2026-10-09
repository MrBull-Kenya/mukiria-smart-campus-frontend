import pool from '../config/db.js';

export const ParentAlertModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS parent_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        parent_email VARCHAR(255) NOT NULL,
        alert_reason TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ adm_no, parent_email, alert_reason }) {
    const [result] = await pool.query(
      'INSERT INTO parent_alerts (adm_no, parent_email, alert_reason) VALUES (?, ?, ?)',
      [adm_no, parent_email, alert_reason]
    );
    return result;
  }
};