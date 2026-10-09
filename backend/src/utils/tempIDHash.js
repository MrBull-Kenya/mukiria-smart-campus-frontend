import crypto from 'crypto';

export const tempIDHash = {
  generateSecureToken(admNo) {
    const secret = process.env.TEMP_ID_SECRET || 'mtti_temp_id_secret_2026';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${admNo}-${Date.now()}`);
    return hmac.digest('hex').substring(0, 16).toUpperCase();
  }
};