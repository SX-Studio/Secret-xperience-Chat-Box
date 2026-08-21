import { NextResponse } from 'next/server';

// TEMPORARY diagnostic — reports env presence and a live DB test WITHOUT leaking any
// secret values (only booleans, the URL host, the key "kind", and the JWT role claim).
// Remove after diagnosing the deployment.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let urlHost = '(missing/invalid)';
  try { urlHost = new URL(url).host; } catch { /* keep default */ }

  const present = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SESSION_SECRET: !!process.env.SESSION_SECRET,
    PHONE_ENCRYPTION_KEY: !!process.env.PHONE_ENCRYPTION_KEY,
    PHONE_HASH_KEY: !!process.env.PHONE_HASH_KEY,
  };

  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const srkKind = srk.startsWith('eyJ')
    ? 'legacy-jwt'
    : srk.startsWith('sb_secret_')
    ? 'sb_secret'
    : srk.startsWith('sb_publishable_')
    ? 'sb_publishable (WRONG — publishable key)'
    : srk
    ? 'other'
    : 'missing';
  let srkRole = 'n/a';
  if (srk.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(srk.split('.')[1], 'base64').toString());
      srkRole = payload.role || '(no role claim)';
    } catch { srkRole = '(unparseable)'; }
  }

  let dbTest: { ok: boolean; error?: string };
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const c = createClient(url, srk, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await c.from('app_config').select('key').limit(1);
    dbTest = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    dbTest = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json({ urlHost, present, serviceRoleKey: { kind: srkKind, jwtRole: srkRole }, dbTest });
}
