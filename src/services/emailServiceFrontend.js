import api from './api';

export const emailService = {
  async sendNotificationEmail(recipientEmail, subject, message) {
    try {
      const response = await api.post('/notifications/email', {
        email: recipientEmail,
        subject,
        message
      });
      return response.data;
    } catch (err) {
      console.error('Failed to send email notification:', err);
      throw err;
    }
  },

  async requestFeesStatement(admNumber, email) {
    try {
      const response = await api.post('/campus/fees/statement-email', {
        adm: admNumber,
        email
      });
      return response.data;
    } catch (err) {
      console.error('Failed to request fees statement email:', err);
      throw err;
    }
  }
};