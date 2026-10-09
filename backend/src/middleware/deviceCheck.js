import { DeviceLockModel } from '../models/DeviceLock.js';

export const verifyDeviceLock = async (req, res, next) => {
  try {
    const adm_no = req.body.adm_no || req.user?.adm_no;
    const device_fingerprint = req.headers['x-device-fingerprint'] || req.body.device_id;

    if (!adm_no) {
      return res.status(400).json({ error: 'Admission number required for device verification.' });
    }

    const deviceLock = await DeviceLockModel.findByAdm(adm_no);

    // If no lock exists yet, register the current device fingerprint for this student
    if (!deviceLock) {
      if (device_fingerprint) {
        await DeviceLockModel.registerDevice(adm_no, device_fingerprint);
      }
      return next();
    }

    // Verify if incoming device fingerprint matches locked device
    if (deviceLock.device_fingerprint !== device_fingerprint) {
      return res.status(403).json({
        error: 'Security Policy Violation: Device mismatch. Account is locked to a registered device.'
      });
    }

    next();
  } catch (err) {
    console.error('Device check middleware error:', err);
    res.status(500).json({ error: 'Failed to verify device lock security constraint.' });
  }
};