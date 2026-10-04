import { STORAGE_KEYS } from '../config/campus';

/**
 * Stable per-browser device id used for device binding (FEAT 2).
 * Previously the app used a 32-bit hash of a canvas image, which is identical on phones of the
 * same model and changes with browser updates. A persisted random id is unique per install.
 * (If a student clears site data or changes phone, the HOD must reset their device lock.)
 */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.deviceId);
    if (!id) {
      const rand = crypto?.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      id = `dev-${rand}`;
      localStorage.setItem(STORAGE_KEYS.deviceId, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode): fall back to a coarse, non-unique descriptor.
    return `ua-${navigator.userAgent}-${screen.width}x${screen.height}`.slice(0, 120);
  }
}

// Descriptive info for display/debugging (DeviceLockBadge etc.). Not used as the identity.
export async function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#069';
  ctx.font = '14px Arial';
  ctx.fillText('MTTI Campus Portal 2026', 2, 15);
  let hash = 0;
  const data = canvas.toDataURL();
  for (let i = 0; i < data.length; i++) hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;

  return {
    deviceId: getDeviceId(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezoneOffset: new Date().getTimezoneOffset(),
    canvasHash: hash.toString(16),
  };
}
