import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { admin } from '@/lib/supabase/admin';
import { rpId, appOrigin } from '@/lib/webauthn';
import { setStepUpCookie } from '@/lib/admin-stepup';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  const isAdmin = (await hasRole(account.id, 'platform_operator')) || (await hasRole(account.id, 'moderator'));
  if (!isAdmin) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { response?: AuthenticationResponseJSON };
  if (!body?.response) return NextResponse.json({ ok: false, error: 'Missing response' }, { status: 400 });

  const { data: cred } = await admin()
    .from('webauthn_credential')
    .select('id, credential_id, public_key, counter, transports')
    .eq('account_id', account.id)
    .eq('credential_id', body.response.id)
    .maybeSingle();
  if (!cred) return NextResponse.json({ ok: false, error: 'Unknown credential' }, { status: 400 });

  const { data: challenge } = await admin()
    .from('webauthn_challenge')
    .select('id, challenge')
    .eq('account_id', account.id)
    .eq('kind', 'authenticate')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!challenge) return NextResponse.json({ ok: false, error: 'No challenge' }, { status: 400 });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge as string,
      expectedOrigin: appOrigin(),
      expectedRPID: rpId(),
      requireUserVerification: true,
      credential: {
        id: cred.credential_id as string,
        publicKey: new Uint8Array(Buffer.from(cred.public_key as string, 'base64')),
        counter: Number(cred.counter),
        transports: (cred.transports ?? []) as AuthenticatorTransport[],
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 400 });
  }
  if (!verification.verified) return NextResponse.json({ ok: false, error: 'Not verified' }, { status: 400 });

  await admin()
    .from('webauthn_credential')
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq('id', cred.id);
  await admin().from('webauthn_challenge').delete().eq('id', challenge.id);
  await writeAudit({ actorId: account.id, action: 'admin.passkey.authenticate', targetType: 'account', targetId: account.public_id });

  await setStepUpCookie(account.id);
  return NextResponse.json({ ok: true, verified: true });
}
