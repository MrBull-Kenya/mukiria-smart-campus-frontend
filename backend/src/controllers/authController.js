import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';
import { UserModel } from '../models/User.js';
import { StudentModel } from '../models/Student.js';
import { DeviceLockModel } from '../models/DeviceLock.js';
import { sendEmail, emailTemplates, emailSettings, isEmailConfigured, missingEmailSettings, describeEmailError } from '../config/email.js';
import { allow } from '../utils/rateLimit.js';
import { sqlDate, asDate, fmtDate, fmtTime } from '../utils/dbHelpers.js';

const RESET_MINUTES = 60;
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const looksLikeEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export const authController = {
  async login(req, res) {
    try {
      const { email, password, device_id } = req.body;
      const user = await UserModel.findByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (user.status && user.status !== 'active') {
        return res.status(403).json({
          error: user.status === 'pending'
            ? (user.role === 'student_rep' ? 'Your class representative account is awaiting HOD approval.' : 'Your account is awaiting Administrator approval.')
            : user.status === 'rejected' ? 'This registration was not approved.' : 'This account has been deactivated.',
        });
      }

      // Admission number lives in the students table (links to the user by user_id)
      const [[student]] = await pool.query('SELECT adm_no FROM students WHERE user_id = ?', [user.id]);
      const adm_no = student?.adm_no || null;

      // Device binding (FEAT 2): the first device a student signs in on is registered; later devices must match
      if (adm_no && device_id && ['student', 'student_rep'].includes(user.role)) {
        const deviceLock = await DeviceLockModel.findByAdm(adm_no);
        if (!deviceLock) await DeviceLockModel.registerDevice(adm_no, device_id);
        else if (deviceLock.device_fingerprint !== device_id) {
          return res.status(403).json({ error: 'Device mismatch. Security policy restricts login to your registered device. Ask your class rep or HOD to reset it.' });
        }
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, class_code: user.class_code, adm_no, tv: user.token_version || 0 },
        process.env.JWT_SECRET || 'supersecretmtti2026',
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, class_code: user.class_code, adm_no }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error during login.' });
    }
  },

  // Always answers the same way whether or not the address has an account, so the form can't be used to find out
  // who is registered. The email is sent in the background so response time doesn't give it away either.
  async forgotPassword(req, res) {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!looksLikeEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (!allow(`forgot-email:${email}`, Number(process.env.RESET_EMAIL_LIMIT) || 5) || !allow(`forgot-ip:${req.ip}`, Number(process.env.RESET_IP_LIMIT) || 20)) {
        return res.status(429).json({ error: 'Too many reset requests. Please wait 15 minutes and try again.' });
      }

      const [[user]] = await pool.query('SELECT id, name, email, status FROM users WHERE LOWER(email) = ?', [email]);
      const eligible = !!user && user.status === 'active'; // pending / rejected / deactivated accounts cannot reset
      const s = emailSettings();
      const mint = async () => {
        const token = crypto.randomBytes(32).toString('hex');
        // only a hash is stored: a database leak must not hand out working reset links
        await pool.query('UPDATE users SET reset_token = ?, reset_expiry = ? WHERE id = ?', [hashToken(token), sqlDate(new Date(Date.now() + RESET_MINUTES * 60000)), user.id]);
        return { token, link: s.frontendUrl ? `${s.frontendUrl}/auth/reset-password?email=${encodeURIComponent(user.email)}&token=${token}` : null };
      };

      if (!isEmailConfigured()) {
        if (eligible && process.env.NODE_ENV !== 'production') { // developer convenience: no SMTP yet, so print the link
          const { token, link } = await mint();
          console.warn(`[DEV] Email is not configured (missing ${missingEmailSettings().join(', ')}). Reset ${link ? `link: ${link}` : `code for ${user.email}: ${token}`}`);
        }
        return res.status(503).json({ error: 'Password reset email is not set up on this server yet. Please ask your HOD or Administrator to help you.' });
      }

      if (eligible) {
        const { token, link } = await mint();
        sendEmail({ to: user.email, ...emailTemplates.resetPassword({ name: user.name, link, token, minutes: RESET_MINUTES }) })
          .catch((err) => console.error(`Reset email to ${user.email} failed: ${describeEmailError(err)}`));
      }
      return res.json({ message: 'If an account exists for that email, we have sent a password reset link. Check your inbox (and the spam folder). It works for 1 hour.' });
    } catch (err) {
      console.error('Forgot password error:', err);
      res.status(500).json({ error: 'Failed to process password reset.' });
    }
  },

  async resetPassword(req, res) {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const token = String(req.body.token || req.params.token || '').trim();
      const { newPassword } = req.body;
      if (!allow(`reset-ip:${req.ip}`, Number(process.env.RESET_ATTEMPT_LIMIT) || 30)) return res.status(429).json({ error: 'Too many attempts. Please wait 15 minutes and try again.' });
      if (String(newPassword || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

      const invalid = () => res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
      const [[user]] = await pool.query('SELECT id, name, email, status, reset_token, reset_expiry FROM users WHERE LOWER(email) = ?', [email]);
      if (!user || user.status !== 'active' || !user.reset_token || !user.reset_expiry || !token) return invalid();
      const given = Buffer.from(hashToken(token)), stored = Buffer.from(String(user.reset_token));
      if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored) || new Date() > asDate(user.reset_expiry)) return invalid();

      // single use; bumping token_version signs out every session issued before now (see verifyToken)
      await pool.query('UPDATE users SET password = ?, reset_token = NULL, reset_expiry = NULL, token_version = token_version + 1 WHERE id = ?', [await bcrypt.hash(newPassword, 10), user.id]);
      if (isEmailConfigured()) {
        sendEmail({ to: user.email, ...emailTemplates.passwordChanged({ name: user.name, when: `${fmtDate(new Date())} ${fmtTime(new Date())}` }) })
          .catch((err) => console.error(`Password-changed email to ${user.email} failed: ${describeEmailError(err)}`));
      }
      res.json({ message: 'Password successfully reset. You can sign in with your new password.' });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  },

  async verifyToken(req, res) {
    res.json({ valid: true, user: req.user });
  },

  // ---- Registration -------------------------------------------------------------------------
  async registerStudent(req, res) {
    try {
      const { adm_no, name, email, parent_email, parent_phone, class_code, password } = req.body;
      return await createAccount(res, { role: 'student', status: 'active', adm_no, name, email, parent_email, parent_phone, class_code, password });
    } catch (err) {
      console.error('Register student error:', err);
      res.status(500).json({ error: 'Registration failed.' });
    }
  },

  // Class reps are created 'pending' until the HOD approves them (FEAT: rep approval flow)
  async registerRep(req, res) {
    try {
      const { adm_no, name, email, parent_email, parent_phone, class_code, password } = req.body;
      return await createAccount(res, { role: 'student_rep', status: 'pending', adm_no, name, email, parent_email, parent_phone, class_code, password });
    } catch (err) {
      console.error('Register rep error:', err);
      res.status(500).json({ error: 'Registration failed.' });
    }
  },

  // Staff register themselves but need Administrator approval (the very first Administrator is approved automatically)
  async registerTeacher(req, res) { return registerStaff(req, res, 'teacher'); },
  async registerHod(req, res) { return registerStaff(req, res, 'hod'); },
  async registerAdmin(req, res) { return registerStaff(req, res, 'admin'); },

  // Accounts are active immediately (no mail-confirmation step), so this just tells the user what to do next.
  async resendVerification(req, res) {
    res.json({ message: 'Your account is already active. You can sign in now (class reps must wait for HOD approval).' });
  }
};

async function createAccount(res, { role, status, adm_no, name, email, parent_email, parent_phone, class_code, password }) {
  if (!adm_no || !name || !email || !class_code || !password) return res.status(400).json({ error: 'Admission number, name, email, class and password are required.' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const normalizedAdm = String(adm_no).trim().toUpperCase();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!normalizedAdm || !normalizedEmail) return res.status(400).json({ error: 'Admission number and email are required.' });

  const [[cls]] = await pool.query('SELECT class_code FROM classes WHERE class_code = ?', [String(class_code).trim()]);
  if (!cls) return res.status(400).json({ error: `Unknown class code "${class_code}". Pick one from the list or ask the HOD to create it.` });

  const hashed = await bcrypt.hash(password, 10);
  const connection = await pool.getConnection();
  let uniqueField = 'email';
  try {
    await connection.beginTransaction();
    if (await connection.query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]).then(([rows]) => rows[0])) {
      await connection.rollback();
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    if (await connection.query('SELECT id FROM students WHERE LOWER(adm_no) = ?', [normalizedAdm.toLowerCase()]).then(([rows]) => rows[0])) {
      await connection.rollback();
      return res.status(409).json({ error: 'This admission number is already registered.' });
    }

    const [created] = await connection.query(
      'INSERT INTO users (email, password, name, role, class_code, device_id) VALUES (?, ?, ?, ?, ?, ?)',
      [normalizedEmail, hashed, String(name).trim(), role, String(class_code).trim(), null]
    );
    await connection.query('UPDATE users SET status = ? WHERE id = ?', [status, created.insertId]);
    uniqueField = 'admission number';
    await connection.query(
      'INSERT INTO students (user_id, adm_no, parent_email, parent_phone) VALUES (?, ?, ?, ?)',
      [created.insertId, normalizedAdm, parent_email || '', parent_phone || '']
    );
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    if (isUniqueConstraintError(err)) {
      return res.status(409).json({ error: uniqueField === 'email' ? 'An account with this email already exists.' : 'This admission number is already registered.' });
    }
    throw err;
  } finally {
    connection.release();
  }

  return res.status(201).json({
    message: status === 'pending' ? 'Registered. The HOD must approve your class representative account before you can sign in.' : 'Account created. You can sign in now.',
    email: normalizedEmail,
    status,
  });
}

const isUniqueConstraintError = (err) =>
  err?.code === 'ER_DUP_ENTRY' || err?.code === 'SQLITE_CONSTRAINT_UNIQUE' || /unique constraint failed/i.test(err?.message || '');

async function registerStaff(req, res, role) {
  try {
    const { name, email, password } = req.body;
    if (!String(name || '').trim() || !String(email || '').trim() || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (await UserModel.findByEmail(email.trim())) return res.status(409).json({ error: 'An account with this email already exists.' });

    // Bootstrap: while no active Administrator exists, the first one to register is approved immediately
    let status = 'pending';
    if (role === 'admin') {
      const [[row]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'");
      if (!row.n) status = 'active';
    }
    const created = await UserModel.create({ email: email.trim(), password: await bcrypt.hash(password, 10), name: name.trim(), role, class_code: null, device_id: null });
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, created.insertId]);
    return res.status(201).json({
      message: status === 'active' ? 'Administrator account created. You can sign in now.' : 'Registered. An Administrator must approve your account before you can sign in.',
      email: email.trim(), status, role,
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) return res.status(409).json({ error: 'An account with this email already exists.' });
    console.error('Register staff error:', err);
    return res.status(500).json({ error: 'Registration failed.' });
  }
}
