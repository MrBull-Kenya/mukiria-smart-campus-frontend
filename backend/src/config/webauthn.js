import { emailSettings } from './email.js';

export function getWebAuthnConfig() {
  const frontendUrl = emailSettings().frontendUrl;
  const explicitOrigins = (process.env.WEBAUTHN_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const configuredOrigins = explicitOrigins.length ? explicitOrigins : (frontendUrl ? [frontendUrl] : []);

  const origins = [...new Set(configuredOrigins.map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return '';
    }
  }).filter(Boolean))];
  const rpID = (process.env.WEBAUTHN_RP_ID || '').trim() || (origins[0] ? new URL(origins[0]).hostname : '');
  const validOrigins = origins.filter((origin) => {
    const url = new URL(origin);
    return (url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname))
      && (url.hostname === rpID || url.hostname.endsWith(`.${rpID}`));
  });

  return {
    enabled: !!rpID && validOrigins.length > 0,
    rpID,
    rpName: process.env.WEBAUTHN_RP_NAME || 'MTTI Smart Campus',
    origins: validOrigins,
  };
}
