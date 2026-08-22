import { NextRequest, NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { admin } from '@/lib/supabase/admin';
import { toE164, phoneHash } from '@/lib/crypto';
import { ensureOperatorIfAllowlisted, findAccountByPhoneHash } from '@/lib/accounts';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Add a phone number to the admin operator allowlist. Operator-only. The number is
// stored ONLY as its keyed HMAC (never plaintext). If an account already exists for
// it, platform_operator is granted immediately; otherwise it's granted on next login.
export async function POST(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!(await hasRole(account.id, 'platform_operator'))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { phone?: string; label?: string };
  let e164: string;
  try {
    e164 = toE164(body?.phone ?? '');
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }

  const hash = phoneHash(e164);
  await admin()
    .from('admin_phone_allowlist')
    .upsert({ phone_hash: hash, label: body?.label ?? null }, { onConflict: 'phone_hash' });

  // If they already have an account, promote now.
  const existing = await findAccountByPhoneHash(hash);
  if (existing) await ensureOperatorIfAllowlisted(existing.id, hash);

  await writeAudit({ actorId: account.id, action: 'admin.operator_allowlisted', targetType: 'account', targetId: existing?.public_id ?? 'pending' });
  return NextResponse.json({ ok: true, promoted: Boolean(existing) });
}
