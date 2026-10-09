import { ParentAlertModel } from '../models/ParentAlert.js';
import { sendParentSMS } from '../config/sms.js';
import { sendEmail, emailTemplates } from '../config/email.js';

export const parentAlertController = {
  async triggerAlert(req, res) {
    try {
      const { adm_no, parent_email, parent_phone, student_name, alert_reason } = req.body;

      await ParentAlertModel.create({ adm_no, parent_email, alert_reason });

      // Send SMS via Africa's Talking (FEAT 6)
      if (parent_phone) {
        await sendParentSMS(parent_phone, `Notice regarding ${student_name}: ${alert_reason}`);
      }

      // Send Email
      if (parent_email) {
        const template = emailTemplates.parentAlert(student_name, alert_reason);
        await sendEmail({ to: parent_email, ...template });
      }

      res.json({ message: 'Parent alert successfully dispatched via SMS and Email.' });
    } catch (err) {
      console.error('Parent alert error:', err);
      res.status(500).json({ error: 'Failed to send parent alert.' });
    }
  }
};