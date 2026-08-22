import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
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

  const body = (await req.json().catch(() => ({}))) as { response?: RegistrationResponseJSON; deviceLabel?: string };
  if (!body?.response) return NextResponse.json({ ok: false, error: 'Missing response' }, { status: 400 });

  const { data: challenge } = await admin()
    .from('webauthn_challenge')
    .select('id, challenge')
    .eq('account_id', account.id)
    .eq('kind', 'register')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!challenge) return NextResponse.json({ ok: false, error: 'No challenge' }, { status: 400 });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge as string,
      expectedOrigin: appOrigin(),
      expectedRPID: rpId(),
      requireUserVerification: true,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ ok: false, error: 'Not verified' }, { status: 400 });
  }

  const cred = verification.registrationInfo.credential;
  const { error } = await admin().from('webauthn_credential').insert({
    account_id: account.id,
    credential_id: cred.id,
    public_key: Buffer.from(cred.publicKey).toString('base64'),
    counter: cred.counter,
    transports: cred.transports ?? [],
    device_label: body.deviceLabel ?? null,
  });
  if (error) return NextResponse.json({ ok: false, error: 'Store failed' }, { status: 500 });

  await admin().from('webauthn_challenge').delete().eq('id', challenge.id);
  await writeAudit({ actorId: account.id, action: 'admin.passkey.register', targetType: 'account', targetId: account.public_id });

  // Registering proves fresh user verification → grant the step-up too.
  await setStepUpCookie(account.id);
  return NextResponse.json({ ok: true, verified: true });
}
