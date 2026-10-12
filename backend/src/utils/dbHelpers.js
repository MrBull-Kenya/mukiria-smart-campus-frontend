import pool from '../config/db.js';

// Thin helpers so controllers stay readable. All SQL in the app is written in the common
// MySQL/SQLite subset (bound parameters, no vendor date functions) so it can be tested without a MySQL server.
export const q = async (sql, params = []) => (await pool.query(sql, params))[0];
export const one = async (sql, params = []) => (await q(sql, params))[0] || null;
export const exec = async (sql, params = []) => (await pool.query(sql, params))[0];

const p2 = (n) => String(n).padStart(2, '0');
export const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
export const asDate = (v) => {
  if (v instanceof Date) return v;
  const value = String(v);
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value.replace(' ', 'T')}Z`);
};
export const nairobiDate = (v) => new Date(asDate(v).getTime() + NAIROBI_OFFSET_MS);
export const sqlDate = (d = new Date()) =>
  `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
export const startOfToday = () => {
  const d = nairobiDate(new Date());
  d.setUTCHours(0, 0, 0, 0);
  return sqlDate(new Date(d.getTime() - NAIROBI_OFFSET_MS));
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (v) => { const d = nairobiDate(v); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
export const fmtTime = (v) => {
  const d = nairobiDate(v), h = d.getUTCHours();
  return `${p2(h % 12 || 12)}:${p2(d.getUTCMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const pct1 = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export const ATTENDANCE_THRESHOLD = 75;
export const ROLES_ALL = ['student', 'student_rep', 'teacher', 'hod', 'admin'];
