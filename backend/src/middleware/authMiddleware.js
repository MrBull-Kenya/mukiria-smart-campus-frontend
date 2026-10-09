import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretmtti2026');
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }

  // A valid signature isn't enough: deactivating an account (admin page) must lock the person out immediately,
  // not when their 7-day token happens to expire.
  try {
    const [rows] = await pool.query('SELECT status, token_version FROM users WHERE id = ?', [decoded.id]);
    if (!rows.length || (rows[0].status && rows[0].status !== 'active')) {
      return res.status(401).json({ error: 'Your account is no longer active. Please sign in again.' });
    }
    if ((decoded.tv || 0) !== (rows[0].token_version || 0)) { // password changed since this login was issued
      return res.status(401).json({ error: 'Your password was changed. Please sign in again.' });
    }
  } catch (err) {
    console.error('Token status check failed:', err);
    return res.status(500).json({ error: 'Could not verify your account.' });
  }
  req.user = decoded;
  next();
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
    }
    next();
  };
};