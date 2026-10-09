import pool from '../config/db.js';

export const ClassModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS classes (
        class_code VARCHAR(50) PRIMARY KEY,
        course VARCHAR(150) NOT NULL,
        module VARCHAR(50) NOT NULL,
        rep_id INT,
        class_teacher_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ class_code, course, module, rep_id }) {
    const [result] = await pool.query(
      'INSERT INTO classes (class_code, course, module, rep_id) VALUES (?, ?, ?, ?)',
      [class_code, course, module, rep_id]
    );
    return result;
  },

  async findByCode(class_code) {
    const [rows] = await pool.query('SELECT * FROM classes WHERE class_code = ?', [class_code]);
    return rows[0];
  },

  async getAll() {
    const [rows] = await pool.query('SELECT * FROM classes');
    return rows;
  }
};