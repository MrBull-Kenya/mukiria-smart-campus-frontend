import pool from '../config/db.js';

export const TimetableVersionModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS timetable_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_code VARCHAR(50) NOT NULL,
        term VARCHAR(50) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        hod_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ class_code, term, status }) {
    const [result] = await pool.query(
      'INSERT INTO timetable_versions (class_code, term, status) VALUES (?, ?, ?)',
      [class_code, term, status || 'pending']
    );
    return result;
  },

  async updateStatus(id, status, hod_comment) {
    await pool.query(
      'UPDATE timetable_versions SET status = ?, hod_comment = ? WHERE id = ?',
      [status, hod_comment, id]
    );
  }
};