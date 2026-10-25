import pool from '../config/db.js';

export const PushSubscriptionModel = {
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint_hash CHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255) NOT NULL,
        auth VARCHAR(255) NOT NULL,
        baseline_complete TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_deliveries (
        endpoint_hash CHAR(64) NOT NULL,
        notification_id VARCHAR(190) NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (endpoint_hash, notification_id),
        FOREIGN KEY (endpoint_hash) REFERENCES push_subscriptions(endpoint_hash) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
  },
};
