import pool from '../config/db.js';

export const ChatMessageModel = {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_code VARCHAR(50) NOT NULL,
        sender_id INT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_code) REFERENCES classes(class_code) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `;
    await pool.query(query);
  },

  async create({ class_code, sender_id, message }) {
    const [result] = await pool.query(
      'INSERT INTO chat_messages (class_code, sender_id, message) VALUES (?, ?, ?)',
      [class_code, sender_id, message]
    );
    return result;
  },

  async getMessagesByClass(class_code) {
    const [rows] = await pool.query(
      `SELECT cm.*, u.name as sender_name FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.class_code = ? ORDER BY cm.created_at ASC`,
      [class_code]
    );
    return rows;
  }
};