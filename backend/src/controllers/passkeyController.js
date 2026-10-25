import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import pool from '../config/db.js';
import { getWebAuthnConfig } from '../config/webauthn.js';
import { DeviceLockModel } from '../models/DeviceLock.js';
import { allow } from '../utils/rateLimit.js';
import { calculateDistance, QR_SCAN_RADIUS_METERS, verifyGeofence } from '../config/mttiGPS.js';
import { verifyToken as verifyQr } from '../utils/qrGenerator.js';
import { activeActingRepById } from '../utils/actingRep.js';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ACCOUNT_DISABLED = 'This account cannot sign in. Use your institute password or contact your Administrator.';
const hashCredentialId = (credentialId) => crypto.createHash('sha256').update(credentialId).digest('hex');
const hashAttendanceContext = ({ userId, sessionId, qrToken, latitude, longitude, deviceId }) =>
  crypto.createHash('sha256')
    .update(JSON.stringify([userId, Number(sessionId), hashCredentialId(qrToken), Number(latitude).toFixed(7), Number(longitude).toFixed(7), deviceId]))
    .digest('hex');

function saveChallenge(challenge, userId, purpose, contextHash = null) {
  return pool.query('DELETE FROM passkey_challenges WHERE expires_at < ?', [new Date()])
    .then(() => pool.query(
    'INSERT INTO passkey_challenges (challenge, user_id, purpose, context_hash, expires_at) VALUES (?, ?, ?, ?, ?)',
    [challenge, userId, purpose, contextHash, new Date(Date.now() + CHALLENGE_TTL_MS)]
    ));
}

async function consumeChallenge(challenge, purpose, userId = null, contextHash = null) {
  const [result] = await pool.query(
    `UPDATE passkey_challenges SET consumed_at = ?
     WHERE challenge = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > ?
       AND ${userId === null ? 'user_id IS NULL' : 'user_id = ?'}
       AND ${contextHash === null ? 'context_hash IS NULL' : 'context_hash = ?'}`,
    [
      new Date(),
      challenge,
      purpose,
      new Date(),
      ...(userId === null ? [] : [userId]),
      ...(contextHash === null ? [] : [contextHash]),
    ]
  );
  return result.affectedRows === 1;
}

function clientResponseError(res, err, message) {
  if (err?.name === 'InvalidStateError' || err?.name === 'NotAllowedError') {
    return res.status(400).json({ error: message });
  }
  console.error('Passkey operation failed:', err);
  return res.status(500).json({ error: 'Passkey sign-in is temporarily unavailable. Please try again.' });
}

export const passkeyController = {
  config(_req, res) {
    const { enabled } = getWebAuthnConfig();
    res.json({ enabled });
  },

  async registrationOptions(req, res) {
    const config = getWebAuthnConfig();
    if (!config.enabled) return res.status(503).json({ error: 'Passkey sign-in is not configured on this server.' });
    if (!allow(`passkey-register-options:${req.user.id}`, 10)) return res.status(429).json({ error: 'Too many passkey setup attempts. Please wait and try again.' });
    try {
      const currentPassword = String(req.body?.current_password || '');
      if (!currentPassword) return res.status(400).json({ error: 'Enter your current password to add a passkey.' });
      const [[user]] = await pool.query('SELECT id, name, email, password, status FROM users WHERE id = ?', [req.user.id]);
      if (!user || user.status !== 'active') return res.status(403).json({ error: ACCOUNT_DISABLED });
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ error: 'Your current password is incorrect. Passkey setup was not started.' });
      }
      const [credentials] = await pool.query(
        'SELECT credential_id, transports FROM passkey_credentials WHERE user_id = ?',
        [user.id]
      );
      const options = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpID,
        userID: Buffer.from(String(user.id)),
        userName: user.email,
        userDisplayName: user.name,
        attestationType: 'none',
        excludeCredentials: credentials.map((credential) => ({
          id: credential.credential_id,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        })),
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'required',
        },
        timeout: 60000,
      });
      await saveChallenge(options.challenge, user.id, 'registration');
      res.json({ options });
    } catch (err) {
      clientResponseError(res, err, 'Could not prepare passkey registration.');
    }
  },

  async verifyRegistration(req, res) {
    const config = getWebAuthnConfig();
    if (!config.enabled) return res.status(503).json({ error: 'Passkey sign-in is not configured on this server.' });
    if (!allow(`passkey-register-verify:${req.user.id}`, 10)) return res.status(429).json({ error: 'Too many passkey setup attempts. Please wait and try again.' });
    const { challenge, response, name } = req.body || {};
    if (typeof challenge !== 'string' || !response || typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({ error: 'Provide a valid passkey response and a name of 1 to 100 characters.' });
    }
    try {
      const consumed = await consumeChallenge(challenge, 'registration', req.user.id);
      if (!consumed) return res.status(400).json({ error: 'Passkey registration expired. Please try again.' });

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: config.origins,
        expectedRPID: config.rpID,
        requireUserVerification: true,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return res.status(400).json({ error: 'Your device could not verify this passkey. Please try again.' });
      }
      const { credential } = verification.registrationInfo;
      const transports = response.response?.transports;
      await pool.query(
        `INSERT INTO passkey_credentials (credential_hash, credential_id, user_id, public_key, counter, transports, name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          hashCredentialId(credential.id),
          credential.id,
          req.user.id,
          Buffer.from(credential.publicKey).toString('base64url'),
          credential.counter,
          transports ? JSON.stringify(transports) : null,
          name.trim(),
        ]
      );
      res.status(201).json({ message: 'Passkey added. You can now sign in with your device.' });
    } catch (err) {
      if (err?.code === 'ER_DUP_ENTRY' || err?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' || err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'This passkey is already registered.' });
      }
      clientResponseError(res, err, 'Passkey registration was cancelled or could not be verified.');
    }
  },

  async authenticationOptions(req, res) {
    const config = getWebAuthnConfig();
    if (!config.enabled) return res.status(503).json({ error: 'Passkey sign-in is not configured on this server.' });
    if (!allow(`passkey-options:${req.ip}`, 30)) return res.status(429).json({ error: 'Too many passkey attempts. Please wait and try again.' });
    try {
      const options = await generateAuthenticationOptions({
        rpID: config.rpID,
        userVerification: 'required',
        timeout: 60000,
      });
      await saveChallenge(options.challenge, null, 'authentication');
      res.json({ options });
    } catch (err) {
      clientResponseError(res, err, 'Could not prepare passkey sign-in.');
    }
  },

  async attendanceOptions(req, res) {
    const config = getWebAuthnConfig();
    if (!config.enabled) return res.status(503).json({ error: 'Biometric attendance is not configured on this server.' });
    if (!allow(`attendance-passkey-options:${req.user.id}`, 10)) {
      return res.status(429).json({ error: 'Too many attendance verification attempts. Please wait and try again.' });
    }

    const sessionId = Number(req.body?.session_id);
    const qrToken = String(req.body?.qr_token || '');
    const latitude = Number(req.body?.gps_lat);
    const longitude = Number(req.body?.gps_lng);
    const deviceId = req.body?.device_id;
    if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || !qrToken || qrToken.length > 4096 ||
        !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
        typeof deviceId !== 'string' || !deviceId || deviceId.length > 255) {
      return res.status(400).json({ error: 'A current QR code, valid location, and registered device are required.' });
    }

    try {
      if (!['student', 'student_rep'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Only trainees can use biometric attendance check-in.' });
      }
      const [[student]] = await pool.query(
        `SELECT s.adm_no, u.class_code FROM students s
         JOIN users u ON u.id = s.user_id WHERE s.user_id = ?`,
        [req.user.id]
      );
      if (!student) return res.status(403).json({ error: 'No trainee record is linked to this account.' });
      const [[session]] = await pool.query('SELECT id, class_code, is_active FROM sessions WHERE id = ?', [sessionId]);
      if (!session || !session.is_active) return res.status(400).json({ error: 'This class session is no longer active.' });
      if (session.class_code !== student.class_code) {
        return res.status(403).json({ error: `This session is for class ${session.class_code}, not ${student.class_code}.` });
      }
      const qr = verifyQr(qrToken);
      if (!qr.valid) return res.status(400).json({ error: qr.reason });
      if (Number(qr.data.session_id) !== sessionId) return res.status(400).json({ error: 'QR code does not match this session.' });
      if (qr.data.acting_assignment_id && !(await activeActingRepById(qr.data.acting_assignment_id, sessionId))) {
        return res.status(403).json({ error: 'This Acting Rep appointment has expired or been revoked.' });
      }
      const qrLatitude = Number(qr.data.qr_lat);
      const qrLongitude = Number(qr.data.qr_lng);
      if (!Number.isFinite(qrLatitude) || qrLatitude < -90 || qrLatitude > 90 ||
          !Number.isFinite(qrLongitude) || qrLongitude < -180 || qrLongitude > 180) {
        return res.status(400).json({ error: 'This QR has no valid representative location. Ask the class representative to refresh it.' });
      }
      const campus = verifyGeofence(latitude, longitude);
      if (req.user.role !== 'student_rep' && !campus.isWithinCampus) {
        return res.status(403).json({ error: `Check-in rejected. You are ${campus.distanceMeters} m from the campus centre; the campus limit is ${process.env.CAMPUS_RADIUS_M || 10000} m.` });
      }
      const repDistance = calculateDistance(latitude, longitude, qrLatitude, qrLongitude);
      if (repDistance > QR_SCAN_RADIUS_METERS) {
        return res.status(403).json({ error: `Move within ${QR_SCAN_RADIUS_METERS} m of the class representative. Your estimated distance is ${Math.round(repDistance)} m.` });
      }
      const lock = await DeviceLockModel.findByAdm(student.adm_no);
      if (!lock || lock.device_fingerprint !== deviceId) {
        return res.status(403).json({ error: 'This is not your registered device. Ask your class rep or HOD to reset it.' });
      }
      const [credentials] = await pool.query(
        'SELECT credential_id, transports FROM passkey_credentials WHERE user_id = ?',
        [req.user.id]
      );
      if (!credentials.length) {
        return res.json({ passkeyAvailable: false, rep_distance_m: Math.round(repDistance), campus_distance_m: campus.distanceMeters });
      }
      const options = await generateAuthenticationOptions({
        rpID: config.rpID,
        allowCredentials: credentials.map((credential) => ({
          id: credential.credential_id,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        })),
        userVerification: 'required',
        timeout: 60000,
      });
      const contextHash = hashAttendanceContext({
        userId: req.user.id, sessionId, qrToken, latitude, longitude, deviceId,
      });
      await saveChallenge(options.challenge, req.user.id, 'attendance', contextHash);
      res.json({ options, rep_distance_m: repDistance, campus_distance_m: campus.distanceMeters });
    } catch (err) {
      console.error('Could not prepare biometric attendance:', err);
      res.status(500).json({ error: 'Could not prepare biometric attendance. Please try again.' });
    }
  },

  async verifyAttendance({ userId, challenge, response, sessionId, qrToken, latitude, longitude, deviceId }) {
    if (typeof challenge !== 'string' || !response || typeof response.id !== 'string') {
      return { ok: false, status: 403, error: 'Biometric verification is required to record attendance.' };
    }
    const contextHash = hashAttendanceContext({
      userId, sessionId, qrToken, latitude, longitude, deviceId,
    });
    try {
      const consumed = await consumeChallenge(challenge, 'attendance', userId, contextHash);
      if (!consumed) {
        return { ok: false, status: 400, error: 'Biometric verification expired or does not match this session and location. Scan the current QR and try again.' };
      }
      const [[credential]] = await pool.query(
        `SELECT credential_id, public_key, counter, transports
         FROM passkey_credentials WHERE credential_hash = ? AND user_id = ?`,
        [hashCredentialId(response.id), userId]
      );
      if (!credential) return { ok: false, status: 401, error: 'This passkey is not registered to your trainee account.' };
      const userHandle = response.response?.userHandle;
      if (userHandle && Buffer.from(userHandle, 'base64url').toString() !== String(userId)) {
        return { ok: false, status: 401, error: 'The passkey does not match your trainee account.' };
      }
      const config = getWebAuthnConfig();
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: config.origins,
        expectedRPID: config.rpID,
        requireUserVerification: true,
        credential: {
          id: credential.credential_id,
          publicKey: Buffer.from(credential.public_key, 'base64url'),
          counter: Number(credential.counter),
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        },
      });
      if (!verification.verified) {
        return { ok: false, status: 401, error: 'Your device could not verify this passkey. Try again.' };
      }
      await pool.query(
        'UPDATE passkey_credentials SET counter = ? WHERE credential_hash = ? AND user_id = ?',
        [verification.authenticationInfo.newCounter, hashCredentialId(response.id), userId]
      );
      return { ok: true };
    } catch (err) {
      if (err?.name === 'WebAuthnError' || err?.name === 'InvalidStateError' || err?.name === 'NotAllowedError') {
        return { ok: false, status: 401, error: 'Biometric verification failed. Please scan the current QR and try again.' };
      }
      console.error('Biometric attendance verification failed:', err);
      return { ok: false, status: 500, error: 'Biometric verification is temporarily unavailable. Please try again.' };
    }
  },

  async verifyAuthentication(req, res) {
    const config = getWebAuthnConfig();
    if (!config.enabled) return res.status(503).json({ error: 'Passkey sign-in is not configured on this server.' });
    if (!allow(`passkey-verify:${req.ip}`, 30)) return res.status(429).json({ error: 'Too many passkey attempts. Please wait and try again.' });
    const { challenge, response, device_id } = req.body || {};
    if (typeof challenge !== 'string' || !response?.id) {
      return res.status(400).json({ error: 'The passkey response is incomplete. Please try again.' });
    }
    if (device_id != null && (typeof device_id !== 'string' || !device_id || device_id.length > 255)) {
      return res.status(400).json({ error: 'This device could not be verified. Please try again.' });
    }
    try {
      const consumed = await consumeChallenge(challenge, 'authentication');
      if (!consumed) return res.status(400).json({ error: 'Passkey sign-in expired. Please try again.' });
      const [[credential]] = await pool.query(
        `SELECT p.credential_id, p.user_id, p.public_key, p.counter, p.transports,
                u.email, u.name, u.role, u.class_code, u.status, u.token_version,
                s.adm_no
         FROM passkey_credentials p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN students s ON s.user_id = u.id
         WHERE p.credential_hash = ?`,
        [hashCredentialId(response.id)]
      );
      if (!credential || credential.status !== 'active') {
        return res.status(401).json({ error: 'Passkey sign-in failed. Use your institute email and password or try another passkey.' });
      }
      const userHandle = response.response?.userHandle;
      if (!userHandle || Buffer.from(userHandle, 'base64url').toString() !== String(credential.user_id)) {
        return res.status(401).json({ error: 'Passkey sign-in failed. Use your institute email and password or try another passkey.' });
      }
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: config.origins,
        expectedRPID: config.rpID,
        requireUserVerification: true,
        credential: {
          id: credential.credential_id,
          publicKey: Buffer.from(credential.public_key, 'base64url'),
          counter: Number(credential.counter),
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        },
      });
      if (!verification.verified) {
        return res.status(401).json({ error: 'Passkey sign-in failed. Use your institute email and password or try another passkey.' });
      }

      if (credential.adm_no && ['student', 'student_rep'].includes(credential.role)) {
        if (!device_id) return res.status(400).json({ error: 'Device information is required for this account. Use your registered device and try again.' });
        const deviceLock = await DeviceLockModel.findByAdm(credential.adm_no);
        if (!deviceLock) await DeviceLockModel.registerDevice(credential.adm_no, device_id);
        else if (deviceLock.device_fingerprint !== device_id) {
          return res.status(403).json({ error: 'Device mismatch. Security policy restricts login to your registered device. Ask your class rep or HOD to reset it.' });
        }
      }

      const { authenticationInfo } = verification;
      await pool.query(
        'UPDATE passkey_credentials SET counter = ? WHERE credential_hash = ?',
        [authenticationInfo.newCounter, hashCredentialId(response.id)]
      );
      const token = jwt.sign(
        { id: credential.user_id, email: credential.email, role: credential.role, class_code: credential.class_code, adm_no: credential.adm_no, tv: credential.token_version || 0 },
        process.env.JWT_SECRET || 'supersecretmtti2026',
        { expiresIn: '7d' }
      );
      res.json({
        message: 'Passkey sign-in successful.',
        token,
        user: { id: credential.user_id, name: credential.name, email: credential.email, role: credential.role, class_code: credential.class_code, adm_no: credential.adm_no },
      });
    } catch (err) {
      if (err?.name === 'WebAuthnError' || err?.name === 'InvalidStateError' || err?.name === 'NotAllowedError') {
        return res.status(401).json({ error: 'Passkey sign-in could not be verified. Please try again or use your password.' });
      }
      console.error('Passkey authentication failed:', err);
      res.status(500).json({ error: 'Passkey sign-in is temporarily unavailable. Please try again.' });
    }
  },

  async list(req, res) {
    try {
      const [credentials] = await pool.query(
        'SELECT credential_hash, name, created_at FROM passkey_credentials WHERE user_id = ? ORDER BY created_at DESC',
        [req.user.id]
      );
      res.json({ passkeys: credentials });
    } catch (err) {
      console.error('Could not list passkeys:', err);
      res.status(500).json({ error: 'Could not load your passkeys.' });
    }
  },

  async remove(req, res) {
    if (!/^[a-f0-9]{64}$/i.test(req.params.credentialHash)) {
      return res.status(404).json({ error: 'Passkey not found.' });
    }
    try {
      const [result] = await pool.query(
        'DELETE FROM passkey_credentials WHERE credential_hash = ? AND user_id = ?',
        [req.params.credentialHash.toLowerCase(), req.user.id]
      );
      if (!result.affectedRows) return res.status(404).json({ error: 'Passkey not found.' });
      res.json({ message: 'Passkey removed.' });
    } catch (err) {
      console.error('Could not remove passkey:', err);
      res.status(500).json({ error: 'Could not remove this passkey.' });
    }
  },
};
