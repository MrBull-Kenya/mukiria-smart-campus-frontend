import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON');
const tr = (sql) => sql
  .replace(/\)\s*ENGINE\s*=\s*InnoDB/gi, ')')
  .replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
  .replace(/\bENUM\s*\([^)]*\)/gi, 'TEXT')
  .replace(/\s+FOR UPDATE\b/gi, '')
  .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '')
  .replace(/\bJSON\b/g, 'TEXT')
  .replace(/ON DUPLICATE KEY UPDATE\s+device_fingerprint\s*=\s*\?/gi, 'ON CONFLICT(adm_no) DO UPDATE SET device_fingerprint = ?');
const fix = (p) => (p === undefined ? null : typeof p === 'boolean' ? +p : p instanceof Date ? p.toISOString().slice(0, 19).replace('T', ' ') : p);
const pool = {
  async query(sql, params = []) {
    const s = tr(sql).trim();
    const stmt = db.prepare(s);
    if (/^\s*(SELECT|PRAGMA|WITH)/i.test(s)) return [stmt.all(...params.map(fix))];
    const r = stmt.run(...params.map(fix));
    return [{ insertId: Number(r.lastInsertRowid), affectedRows: Number(r.changes) }];
  },
  async getConnection() {
    return {
      query: pool.query,
      async beginTransaction() { db.exec('BEGIN'); },
      async commit() { db.exec('COMMIT'); },
      async rollback() { db.exec('ROLLBACK'); },
      release() {},
    };
  },
};
export async function testConnection() { console.log('(test) sqlite in-memory'); }
export default pool;
