import pool from '../config/db.js';

// Idempotent schema additions on top of the original tables. Only already-applied
// schema changes are ignored; other errors must stop startup.
const statements = [
  "ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'",
  'ALTER TABLE sessions ADD COLUMN signed_by INT NULL',
  'ALTER TABLE sessions ADD COLUMN signed_at DATETIME NULL',
  'ALTER TABLE sessions ADD COLUMN venue VARCHAR(100) NULL',
  'ALTER TABLE sessions ADD COLUMN ended_at DATETIME NULL',
  'ALTER TABLE classes ADD COLUMN department VARCHAR(100) NULL',
  'ALTER TABLE classes ADD COLUMN class_teacher_id INT NULL',
  "ALTER TABLE attendance_logs ADD COLUMN record_method VARCHAR(20) NOT NULL DEFAULT 'qr'",
  'ALTER TABLE attendance_logs ADD COLUMN recorded_by INT NULL',
  `CREATE TABLE IF NOT EXISTS app_settings (
     setting_key VARCHAR(50) PRIMARY KEY,
     setting_value VARCHAR(255)
   ) ENGINE=InnoDB`,
  'ALTER TABLE chat_messages ADD COLUMN is_announcement TINYINT DEFAULT 0',
  'ALTER TABLE temp_id_requests ADD COLUMN reason VARCHAR(255) NULL',
  'ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0', // bumped on every password change: older logins stop working
  'ALTER TABLE users ADD COLUMN manual_attendance_pin_hash VARCHAR(255) NULL',
  'ALTER TABLE users ADD COLUMN manual_attendance_pin_version INT NOT NULL DEFAULT 0',
  'ALTER TABLE students ADD COLUMN profile_photo_url VARCHAR(255) NULL',
  'ALTER TABLE users ADD COLUMN department VARCHAR(100) NULL',
  'ALTER TABLE users ADD COLUMN teacher_unit VARCHAR(150) NULL',
  'ALTER TABLE timetable_versions ADD COLUMN file_name VARCHAR(255) NULL',
  'ALTER TABLE timetable_versions ADD COLUMN file_path VARCHAR(255) NULL',
  'ALTER TABLE timetable_versions ADD COLUMN file_type VARCHAR(100) NULL',
  'ALTER TABLE timetable_versions ADD COLUMN file_size INT NULL',
  'ALTER TABLE timetable_versions ADD COLUMN approved_at DATETIME NULL',
  "UPDATE timetable_versions SET approved_at = created_at WHERE status = 'approved' AND approved_at IS NULL",
  "ALTER TABLE parent_alerts ADD COLUMN delivery VARCHAR(30) DEFAULT 'logged'",
  'ALTER TABLE attendance_logs ADD COLUMN rep_distance_m INT NULL',
  `CREATE TABLE IF NOT EXISTS fee_accounts (
     adm_no VARCHAR(50) PRIMARY KEY,
     total_fees INT NOT NULL DEFAULT 0,
     paid_amount INT NOT NULL DEFAULT 0,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
     id INT AUTO_INCREMENT PRIMARY KEY,
     actor_id INT NULL,
     actor_name VARCHAR(150) NOT NULL,
     actor_role VARCHAR(30) NOT NULL,
     action_method VARCHAR(10) NOT NULL,
     action_route VARCHAR(255) NOT NULL,
     status_code INT NOT NULL,
     duration_ms INT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS acting_rep_assignments (
     id INT AUTO_INCREMENT PRIMARY KEY,
     class_code VARCHAR(50) NOT NULL,
     session_id INT NULL,
     appointed_by INT NOT NULL,
     acting_user_id INT NOT NULL,
     created_at DATETIME NOT NULL,
     expires_at DATETIME NOT NULL,
     revoked_at DATETIME NULL
   ) ENGINE=InnoDB`,
  'CREATE INDEX idx_acting_rep_user_expiry ON acting_rep_assignments (acting_user_id, expires_at)',
  'CREATE INDEX idx_acting_rep_class_expiry ON acting_rep_assignments (class_code, expires_at)',
  'CREATE INDEX idx_acting_rep_session ON acting_rep_assignments (session_id)',
  'ALTER TABLE activity_logs ADD COLUMN duration_ms INT NULL',
  `CREATE TABLE IF NOT EXISTS passkey_credentials (
      credential_hash CHAR(64) PRIMARY KEY,
      credential_id VARCHAR(1024) NOT NULL,
      user_id INT NOT NULL,
     public_key TEXT NOT NULL,
     counter BIGINT UNSIGNED NOT NULL DEFAULT 0,
     transports TEXT NULL,
     name VARCHAR(100) NOT NULL DEFAULT 'Passkey',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     CONSTRAINT fk_passkey_credentials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   ) ENGINE=InnoDB`,
  'CREATE INDEX idx_passkey_credentials_user ON passkey_credentials (user_id)',
  `CREATE TABLE IF NOT EXISTS passkey_challenges (
     challenge VARCHAR(255) PRIMARY KEY,
     user_id INT NULL,
     purpose VARCHAR(20) NOT NULL,
     context_hash CHAR(64) NULL,
     expires_at DATETIME NOT NULL,
     consumed_at DATETIME NULL
   ) ENGINE=InnoDB`,
  'ALTER TABLE push_subscriptions ADD COLUMN baseline_complete TINYINT NOT NULL DEFAULT 0',
  'ALTER TABLE passkey_challenges ADD COLUMN context_hash CHAR(64) NULL',
  'CREATE INDEX idx_passkey_challenges_expiry ON passkey_challenges (expires_at)',
  'CREATE INDEX idx_activity_logs_created_at ON activity_logs (created_at)',
  // One check-in per student per session (also enforced in code)
  'CREATE UNIQUE INDEX uq_attendance_session_adm ON attendance_logs (session_id, adm_no)',
];

export async function runMigrations() {
  for (const sql of statements) {
    try {
      await pool.query(sql);
    } catch (err) {
      const duplicateSchemaChange =
        ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR'].includes(err.code) ||
        /duplicate column name|(?:table|index) .+ already exists/i.test(err.message);
      if (!duplicateSchemaChange) {
        throw new Error(`Database migration failed: ${sql.slice(0, 70)} — ${err.message}`, { cause: err });
      }
    }
  }
}
