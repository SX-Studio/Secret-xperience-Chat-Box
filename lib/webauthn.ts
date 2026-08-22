import { env } from '@/lib/env';

// WebAuthn RP config for the admin fingerprint gate. RP ID = registrable domain
// (content24market.space in prod); origin = full https origin.
export const RP_NAME = 'Content Box Admin';
export const rpId = () => env.rpId();
export const appOrigin = () => env.appOrigin();
