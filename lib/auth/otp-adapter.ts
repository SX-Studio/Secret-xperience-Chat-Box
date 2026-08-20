// Provider-agnostic SMS interface. Phase 1 ships the stub; Twilio/MessageBird/Vonage
// implement this same shape later without touching the auth routes.
export interface OtpSender {
  send(phoneE164: string, code: string): Promise<void>;
}
