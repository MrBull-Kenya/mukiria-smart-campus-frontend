import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const profileController = {
  async get(req, res) {
    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.class_code, u.department, u.teacher_unit,
          s.adm_no, s.parent_email, s.parent_phone
         FROM users u LEFT JOIN students s ON s.user_id = u.id WHERE u.id = ?`,
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
      res.json({ user: rows[0] });
    } catch (err) {
      console.error('Could not load account profile:', err);
      res.status(500).json({ error: 'Could not load your profile.' });
    }
  },

  async update(req, res) {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const department = String(req.body.department || '').trim();
    const teacherUnit = String(req.body.teacher_unit || '').trim();
    const parentEmail = String(req.body.parent_email || '').trim().toLowerCase();
    const parentPhone = String(req.body.parent_phone || '').trim();

    if (!name || name.length > 150) return res.status(400).json({ error: 'Name is required and must be 150 characters or fewer.' });
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (department.length > 100) return res.status(400).json({ error: 'Department must be 100 characters or fewer.' });
    if (teacherUnit.length > 150) return res.status(400).json({ error: 'Subject or unit must be 150 characters or fewer.' });
    if (parentEmail && (parentEmail.length > 254 || !EMAIL_PATTERN.test(parentEmail))) return res.status(400).json({ error: 'Enter a valid parent email address or leave it blank.' });
    if (parentPhone.length > 50) return res.status(400).json({ error: 'Parent phone must be 50 characters or fewer.' });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.query('SELECT id, role FROM users WHERE id = ? FOR UPDATE', [req.user.id]);
      if (!users.length) {
        await connection.rollback();
        return res.status(404).json({ error: 'Account not found.' });
      }
      const [duplicates] = await connection.query('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id <> ?', [email, req.user.id]);
      if (duplicates.length) {
        await connection.rollback();
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const role = users[0].role;
      await connection.query(
        `UPDATE users SET name = ?, email = ?, department = ?, teacher_unit = ? WHERE id = ?`,
        [name, email, ['teacher', 'hod'].includes(role) ? department || null : null, role === 'teacher' ? teacherUnit || null : null, req.user.id]
      );
      if (['student', 'student_rep'].includes(role)) {
        await connection.query('UPDATE students SET parent_email = ?, parent_phone = ? WHERE user_id = ?', [parentEmail, parentPhone, req.user.id]);
      }
      await connection.commit();
      res.json({
        message: 'Your profile has been updated.',
        user: { id: req.user.id, name, email, role, department: ['teacher', 'hod'].includes(role) ? department : null, teacher_unit: role === 'teacher' ? teacherUnit : null },
      });
    } catch (err) {
      await connection.rollback();
      console.error('Could not update account profile:', err);
      res.status(500).json({ error: 'Could not update your profile.' });
    } finally {
      connection.release();
    }
  },

  async changePassword(req, res) {
    const currentPassword = String(req.body.current_password || '');
    const newPassword = String(req.body.new_password || '');
    if (!currentPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Enter your current password and a new password of at least 8 characters.' });
    }
    if (currentPassword === newPassword) return res.status(400).json({ error: 'Choose a new password different from your current password.' });

    try {
      const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
      if (!rows.length) return res.status(404).json({ error: 'Account not found.' });
      if (!(await bcrypt.compare(currentPassword, rows[0].password))) {
        return res.status(400).json({ error: 'Your current password is incorrect.' });
      }
      const password = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = ?, token_version = token_version + 1, reset_token = NULL, reset_expiry = NULL WHERE id = ?', [password, req.user.id]);
      res.json({ message: 'Password changed. Sign in again with your new password.' });
    } catch (err) {
      console.error('Could not change account password:', err);
      res.status(500).json({ error: 'Could not change your password.' });
    }
  },
};
