import pool from '../config/db.js';

// Thin helpers so controllers stay readable. All SQL in the app is written in the common
// MySQL/SQLite subset (bound parameters, no vendor date functions) so it can be tested without a MySQL server.
export const q = async (sql, params = []) => (await pool.query(sql, params))[0];
export const one = async (sql, params = []) => (await q(sql, params))[0] || null;
export const exec = async (sql, params = []) => (await pool.query(sql, params))[0];

const p2 = (n) => String(n).padStart(2, '0');
export const sqlDate = (d = new Date()) =>
  `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return sqlDate(d); };
export const asDate = (v) => (v instanceof Date ? v : new Date(String(v).replace(' ', 'T')));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (v) => { const d = asDate(v); return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const fmtTime = (v) => { const d = asDate(v); const h = d.getHours() % 12 || 12; return `${p2(h)}:${p2(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`; };
export const pct1 = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export const ATTENDANCE_THRESHOLD = 75;
export const ROLES_ALL = ['student', 'student_rep', 'teacher', 'hod', 'admin'];
