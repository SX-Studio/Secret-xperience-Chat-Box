// Central, validated access to environment variables. Throwing here (server-side)
// is better than a confusing failure deep in a request. Public vars are safe to
// read on the client; everything else is server-only.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  // Server-only below — never import these into client components.
  serviceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  phoneEncryptionKey: () => required('PHONE_ENCRYPTION_KEY'),
  phoneHashKey: () => required('PHONE_HASH_KEY'),
  sessionSecret: () => required('SESSION_SECRET'),
  otpTtlSeconds: () => Number(process.env.OTP_TTL_SECONDS ?? '300'),
  otpMaxAttempts: () => Number(process.env.OTP_MAX_ATTEMPTS ?? '5'),
  otpSender: () => process.env.OTP_SENDER ?? 'stub',
};
