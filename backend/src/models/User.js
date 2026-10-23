import pool from '../config/db.js';

export const UserModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(150) NOT NULL,
        role ENUM('student', 'student_rep', 'teacher', 'hod', 'admin') DEFAULT 'student',
        class_code VARCHAR(50),
        reset_token VARCHAR(255),
        reset_expiry DATETIME,
        device_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ email, password, name, role, class_code, device_id }) {
    const [result] = await pool.query(
      'INSERT INTO users (email, password, name, role, class_code, device_id) VALUES (?, ?, ?, ?, ?, ?)',
      [email, password, name, role || 'student', class_code || null, device_id || null]
    );
    return result;
  },

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  async updateResetToken(email, token, expiry) {
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_expiry = ? WHERE email = ?',
      [token, expiry, email]
    );
  },

  async updateDevice(id, device_id) {
    await pool.query('UPDATE users SET device_id = ? WHERE id = ?', [device_id, id]);
  }
};