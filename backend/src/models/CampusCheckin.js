import pool from '../config/db.js';

export const CampusCheckinModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS campus_checkins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        adm_no VARCHAR(50) NOT NULL,
        service_type ENUM('library', 'games', 'fees') NOT NULL,
        status_details VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ adm_no, service_type, status_details }) {
    const [result] = await pool.query(
      'INSERT INTO campus_checkins (adm_no, service_type, status_details) VALUES (?, ?, ?)',
      [adm_no, service_type, status_details || null]
    );
    return result;
  },

  async getByAdm(adm_no) {
    const [rows] = await pool.query('SELECT * FROM campus_checkins WHERE adm_no = ?', [adm_no]);
    return rows;
  }
};