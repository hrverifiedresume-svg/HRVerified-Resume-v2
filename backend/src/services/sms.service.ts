import twilio from 'twilio';
import { logger } from '../utils/logger';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const smsService = {
  /**
   * Send OTP via SMS
   */
  async sendOTP(phone: string, otp: string) {
    try {
      await twilioClient.messages.create({
        body: `Your HRVerified Resume OTP: ${otp}. Valid for 10 minutes. Do not share.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      logger.info(`OTP SMS sent to ${phone}`);
    } catch (error) {
      logger.error('Send OTP SMS failed:', error);
      throw error;
    }
  },
};
