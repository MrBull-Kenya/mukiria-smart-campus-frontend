import AfricasTalking from 'africastalking';
import dotenv from 'dotenv';

dotenv.config();

const africasTalking = AfricasTalking({
  apiKey: process.env.AT_API_KEY || 'sandbox_key',
  username: process.env.AT_USERNAME || 'sandbox'
});

const sms = africasTalking.SMS;

export const sendParentSMS = async (toPhoneNumber, message) => {
  try {
    const options = {
      to: [toPhoneNumber],
      message: `[MTTI Portal Notice]: ${message}`,
      from: process.env.AT_SENDER_ID || undefined
    };

    const response = await sms.send(options);
    return response;
  } catch (err) {
    console.error('Africa\'s Talking SMS delivery failed:', err);
    throw err;
  }
};