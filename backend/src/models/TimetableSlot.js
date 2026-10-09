import pool from '../config/db.js';

export const TimetableSlotModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS timetable_slots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version_id INT NOT NULL,
        day_of_week VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        unit_name VARCHAR(150) NOT NULL,
        venue VARCHAR(100) NOT NULL,
        lecturer_name VARCHAR(150) NOT NULL,
        FOREIGN KEY (version_id) REFERENCES timetable_versions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ version_id, day_of_week, start_time, end_time, unit_name, venue, lecturer_name }) {
    const [result] = await pool.query(
      'INSERT INTO timetable_slots (version_id, day_of_week, start_time, end_time, unit_name, venue, lecturer_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [version_id, day_of_week, start_time, end_time, unit_name, venue, lecturer_name]
    );
    return result;
  },

  async getSlotsByVersion(version_id) {
    const [rows] = await pool.query('SELECT * FROM timetable_slots WHERE version_id = ?', [version_id]);
    return rows;
  }
};