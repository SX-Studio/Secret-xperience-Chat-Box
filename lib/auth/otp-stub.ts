import type { OtpSender } from './otp-adapter';

// Phase 1 sender: logs the code to the server console instead of sending an SMS.
// Lets the whole auth flow be built and tested with no real provider configured.
export const stubSender: OtpSender = {
  async send(phoneE164, code) {
    // eslint-disable-next-line no-console
    console.log(`[OTP:stub] ${phoneE164} -> ${code}`);
  },
};
