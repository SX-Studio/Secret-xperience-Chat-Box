import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { admin } from '@/lib/supabase/admin';
import { rpId } from '@/lib/webauthn';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  const isAdmin = (await hasRole(account.id, 'platform_operator')) || (await hasRole(account.id, 'moderator'));
  if (!isAdmin) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const { data: creds } = await admin()
    .from('webauthn_credential')
    .select('credential_id, transports')
    .eq('account_id', account.id);
  if (!creds || creds.length === 0) return NextResponse.json({ needsRegister: true });

  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    userVerification: 'required',
    allowCredentials: creds.map((c) => ({
      id: c.credential_id as string,
      transports: (c.transports ?? []) as AuthenticatorTransport[],
    })),
  });

  await admin().from('webauthn_challenge').insert({
    account_id: account.id,
    challenge: options.challenge,
    kind: 'authenticate',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });

  return NextResponse.json(options);
}
