import { sendEmail, emailTemplates } from '../config/email.js';

export const emailService = {
  async sendWelcome(email, name) {
    const template = emailTemplates.welcome(name, email);
    return await sendEmail({ to: email, ...template });
  },

  async sendResetLink(email, name, token) {
    const template = emailTemplates.resetPassword(name, token);
    return await sendEmail({ to: email, ...template });
  },

  async sendParentAlertEmail(email, studentName, reason) {
    const template = emailTemplates.parentAlert(studentName, reason);
    return await sendEmail({ to: email, ...template });
  },

  async sendTimetableUpdateEmail(email, name, classCode, summary) {
    const template = emailTemplates.timetable(name, classCode, summary);
    return await sendEmail({ to: email, ...template });
  }
};