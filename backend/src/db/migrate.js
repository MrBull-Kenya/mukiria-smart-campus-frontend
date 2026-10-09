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
  'ALTER TABLE timetable_versions ADD COLUMN file_name VARCHAR(255) NULL',
  'ALTER TABLE timetable_versions ADD COLUMN file_path VARCHAR(255) NULL',
  'ALTER TABLE timetable_versions ADD COLUMN file_type VARCHAR(100) NULL',
  'ALTER TABLE timetable_versions ADD COLUMN file_size INT NULL',
  "ALTER TABLE parent_alerts ADD COLUMN delivery VARCHAR(30) DEFAULT 'logged'",
  `CREATE TABLE IF NOT EXISTS fee_accounts (
     adm_no VARCHAR(50) PRIMARY KEY,
     total_fees INT NOT NULL DEFAULT 0,
     paid_amount INT NOT NULL DEFAULT 0,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB`,
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
