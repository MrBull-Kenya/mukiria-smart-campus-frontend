import pool from '../config/db.js';

export const BadgeModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS badges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        badge_name VARCHAR(100) NOT NULL,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ adm_no, badge_name }) {
    const [result] = await pool.query(
      'INSERT INTO badges (adm_no, badge_name) VALUES (?, ?)',
      [adm_no, badge_name]
    );
    return result;
  },

  async getByAdm(adm_no) {
    const [rows] = await pool.query('SELECT * FROM badges WHERE adm_no = ?', [adm_no]);
    return rows;
  }
};