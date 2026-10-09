import pool from '../config/db.js';

export const MinistryReportModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ministry_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report_title VARCHAR(250) NOT NULL,
        data_payload JSON NOT NULL,
        generated_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ report_title, data_payload, generated_by }) {
    const [result] = await pool.query(
      'INSERT INTO ministry_reports (report_title, data_payload, generated_by) VALUES (?, ?, ?)',
      [report_title, JSON.stringify(data_payload), generated_by]
    );
    return result;
  },

  async getAll() {
    const [rows] = await pool.query('SELECT * FROM ministry_reports ORDER BY created_at DESC');
    return rows;
  }
};