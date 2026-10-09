import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Settings come from the process environment: backend/.env locally, or the host's service variables in production.
export function emailSettings() {
  const e = process.env;
  const port = parseInt(e.EMAIL_PORT, 10) || 587;
  return {
    host: e.EMAIL_HOST || '',
    port,
    secure: e.EMAIL_SECURE ? e.EMAIL_SECURE === 'true' : port === 465, // 465 = implicit TLS, 587 = STARTTLS
    user: e.EMAIL_USER || '',
    pass: e.EMAIL_PASS || '',
    // Most providers (Gmail included) only accept mail "from" the account you log in with
    from: e.EMAIL_FROM || (e.EMAIL_USER ? `"MTTI Smart Campus" <${e.EMAIL_USER}>` : ''),
    frontendUrl: (e.FRONTEND_URL || '').trim().replace(/\/+$/, ''), // base of the links inside emails
  };
}

export const missingEmailSettings = () => ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'].filter((k) => !process.env[k]);
export const isEmailConfigured = () => missingEmailSettings().length === 0;

export async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) throw Object.assign(new Error('Email is not configured'), { code: 'ENOTCONFIGURED' });
  const s = emailSettings();
  const transport = nodemailer.createTransport({
    host: s.host, port: s.port, secure: s.secure,
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000, // fail fast instead of hanging for minutes
    auth: { user: s.user, pass: s.pass },
  });
  try {
    return await transport.sendMail({ from: s.from, to, subject, text, html });
  } catch (err) {
    console.error('Email dispatch failed:', err.code || '', err.message);
    throw err;
  } finally {
    transport.close();
  }
}

// Turns a low-level mail error into something an Administrator can act on
export function describeEmailError(err) {
  const code = err?.code, resp = String(err?.response || '');
  const s = emailSettings();
  if (code === 'ENOTCONFIGURED') return 'Email is not configured. Set EMAIL_HOST, EMAIL_USER and EMAIL_PASS in backend/.env locally or in the deployed backend service variables, then restart the backend.';
  if (code === 'EAUTH' || /^535|authentication/i.test(resp)) return 'The mail server rejected the username or password. For Gmail use an App Password (Google Account > Security > 2-Step Verification > App passwords), not your normal password.';
  const text = `${code || ''} ${err?.message || ''}`;
  // nodemailer reports a refused/unknown host as code ESOCKET with the real cause only in the message
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|ECONNRESET|ECONNECTION|EDNS|timed? ?out/i.test(text)) return `Cannot reach the mail server ${s.host}:${s.port}. Check EMAIL_HOST and EMAIL_PORT, and that this computer is online.`;
  if (/self.signed|certificate|CERT_/i.test(text)) return `The mail server's security certificate was not accepted (${s.host}). Use the provider's official SMTP host name.`;
  if (code === 'ESOCKET' || /wrong version|ssl|tls|EPROTO/i.test(text)) return `Could not open a secure connection to ${s.host}:${s.port}. Port 465 needs EMAIL_SECURE=true; port 587 needs EMAIL_SECURE=false.`;
  if (code === 'EENVELOPE') return 'The mail server refused the sender or recipient address.';
  return err?.message || 'The email could not be sent.';
}

// Names and other values end up inside HTML, so escape them (a name like <b>x</b> must not become markup)
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const shell = (inner) => `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827;">
    <h2 style="color: #1e3a8a; margin: 0;">Mukiria Technical Training Institute</h2>
    <p style="color: #6b7280; margin: 2px 0 20px; font-size: 13px;">Smart Campus</p>
    ${inner}
  </div>`;
const button = (href, label) => `<p style="margin: 22px 0;"><a href="${esc(href)}" style="background: #2563eb; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">${esc(label)}</a></p>`;

export const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to MTTI Smart Campus',
    text: `Hello ${name}, welcome to MTTI Smart Campus. Your account is active.`,
    html: shell(`<h3>Welcome, ${esc(name)}!</h3><p>Your account is active. You can sign in to the Smart Campus portal.</p>`),
  }),

  resetPassword: ({ name, link, token, minutes = 60 }) => ({
    subject: 'Reset your MTTI Smart Campus password',
    text: [
      `Hello ${name},`, '',
      'We received a request to reset the password for your MTTI Smart Campus account.', '',
      link ? `Open this link to choose a new password (valid for ${minutes} minutes, one use only):\n${link}`
           : `Open the Smart Campus "Forgot password" page, choose "I have a code", and enter your email with this code (valid for ${minutes} minutes, one use only):\n${token}`,
      '', "If you did not ask for this, ignore this email. Your password will not change.",
    ].join('\n'),
    html: shell(`
      <h3 style="margin-bottom: 8px;">Reset your password</h3>
      <p>Hello ${esc(name)},</p>
      <p>We received a request to reset the password for your account. This works for <strong>${minutes} minutes</strong> and only once.</p>
      ${link
        ? `${button(link, 'Choose a new password')}<p style="font-size: 12px; color: #6b7280;">If the button does not work, copy this address into your browser:<br>${esc(link)}</p>`
        : `<p>Open the Smart Campus "Forgot password" page, choose <em>I have a code</em>, and enter your email with this code:</p><p style="padding: 12px; background: #f3f4f6; font-family: monospace; font-size: 15px; font-weight: bold; word-break: break-all;">${esc(token)}</p>`}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="font-size: 12px; color: #6b7280;">If you did not ask for this, ignore this email. Your password will not change.</p>`),
  }),

  passwordChanged: ({ name, when }) => ({
    subject: 'Your MTTI Smart Campus password was changed',
    text: `Hello ${name},\n\nThe password for your MTTI Smart Campus account was changed on ${when}. You were signed out of other devices.\n\nIf this was not you, contact your HOD or the Administrator immediately.`,
    html: shell(`<h3>Your password was changed</h3><p>Hello ${esc(name)},</p><p>The password for your account was changed on <strong>${esc(when)}</strong>. You were signed out of other devices.</p><p style="color: #b91c1c;">If this was not you, contact your HOD or the Administrator immediately.</p>`),
  }),

  test: () => ({
    subject: 'MTTI Smart Campus test email',
    text: 'This is a test email from MTTI Smart Campus. Your email settings work, so password reset emails will be delivered.',
    html: shell('<h3>Email is working</h3><p>This is a test email from MTTI Smart Campus. Password reset emails will be delivered with these settings.</p>'),
  }),

  parentAlert: (studentName, eventDetails) => ({
    subject: `Parent Alert: Notice regarding ${studentName}`,
    text: `Dear Parent/Guardian, notice regarding ${studentName}: ${eventDetails}`,
    html: shell(`<h3 style="color: #059669;">Parent Notification</h3><p>Dear Parent/Guardian,</p><p>This is an official automated update regarding <b>${esc(studentName)}</b>:</p><blockquote style="border-left: 4px solid #059669; padding-left: 10px; color: #374151;">${esc(eventDetails)}</blockquote>`),
  }),

  timetable: (name, classCode, scheduleSummary) => ({
    subject: `Updated Class Timetable - ${classCode}`,
    text: `Hello ${name}, here is your updated timetable schedule for class ${classCode}.`,
    html: shell(`<h3 style="color: #4f46e5;">Timetable Update: ${esc(classCode)}</h3><p>Hello ${esc(name)}, your class schedule has been updated.</p><p>${esc(scheduleSummary)}</p>`),
  }),
};
