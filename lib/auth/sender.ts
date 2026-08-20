import 'server-only';
import type { OtpSender } from './otp-adapter';
import { stubSender } from './otp-stub';
import { env } from '@/lib/env';

// Resolves the active sender from OTP_SENDER. Only 'stub' exists in Phase 1;
// add 'twilio' | 'messagebird' | 'vonage' here — each an OtpSender — when chosen.
export function getSender(): OtpSender {
  switch (env.otpSender()) {
    case 'stub':
    default:
      return stubSender;
  }
}
