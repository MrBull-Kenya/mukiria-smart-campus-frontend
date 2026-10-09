// Create a staff account (teacher / hod / admin) or any other user from the command line.
// Students and class reps register themselves in the app; teachers and the HOD cannot, by design.
//
//   node scripts/create-user.mjs --role hod --name "Dr. Jane Wanjiku" --email hod@mtti.ac.ke --password "ChangeMe123!"
//   node scripts/create-user.mjs --role teacher --name "Mr. Otieno" --email otieno@mtti.ac.ke --password "ChangeMe123!"
//
// The teacher's NAME must match the lecturer name class reps pick when they start a session.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';
import { initializeDatabaseTables } from '../src/db/init.js';

const ROLES = ['teacher', 'hod', 'admin'];

export async function createUser({ role, name, email, password }) {
  if (!ROLES.includes(role)) throw new Error(`--role must be one of: ${ROLES.join(', ')}`);
  if (!name || !email || !password) throw new Error('--name, --email and --password are required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');
  await initializeDatabaseTables();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw new Error(`A user with email ${email} already exists`);
  const [r] = await pool.query("INSERT INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, 'active')", [email, await bcrypt.hash(password, 10), name, role]);
  return r.insertId;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop());
if (isMain) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []));
  createUser(args)
    .then((id) => { console.log(`Created ${args.role} "${args.name}" (user id ${id}).`); process.exit(0); })
    .catch((e) => { console.error('Error:', e.message); process.exit(1); });
}
