import pool from '../config/db.js';

export const StudentModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        adm_no VARCHAR(50) UNIQUE NOT NULL,
        parent_email VARCHAR(255) NOT NULL,
        parent_phone VARCHAR(50) NOT NULL,
        points INT DEFAULT 0,
        attendance_pct DECIMAL(5,2) DEFAULT 100.00,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ user_id, adm_no, parent_email, parent_phone }) {
    const [result] = await pool.query(
      'INSERT INTO students (user_id, adm_no, parent_email, parent_phone) VALUES (?, ?, ?, ?)',
      [user_id, adm_no, parent_email, parent_phone]
    );
    return result;
  },

  async findByAdm(adm_no) {
    const [rows] = await pool.query('SELECT * FROM students WHERE adm_no = ?', [adm_no]);
    return rows[0];
  },

  async updatePointsAndAttendance(adm_no, pointsDelta, newAttendancePct) {
    await pool.query(
      'UPDATE students SET points = points + ?, attendance_pct = ? WHERE adm_no = ?',
      [pointsDelta, newAttendancePct, adm_no]
    );
  }
};