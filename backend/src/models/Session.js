import pool from '../config/db.js';

export const SessionModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_code VARCHAR(50) NOT NULL,
        unit_name VARCHAR(150) NOT NULL,
        lecturer_name VARCHAR(150) NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        late_threshold_mins INT DEFAULT 15,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ class_code, unit_name, lecturer_name, start_time, end_time, late_threshold_mins }) {
    const [result] = await pool.query(
      'INSERT INTO sessions (class_code, unit_name, lecturer_name, start_time, end_time, late_threshold_mins) VALUES (?, ?, ?, ?, ?, ?)',
      [class_code, unit_name, lecturer_name, start_time, end_time, late_threshold_mins || 15]
    );
    return result;
  },

  async findActiveSession(class_code) {
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE class_code = ? AND is_active = TRUE',
      [class_code]
    );
    return rows[0];
  }
};