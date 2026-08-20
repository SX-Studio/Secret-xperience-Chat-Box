import { NextRequest, NextResponse } from 'next/server';
import { currentAccount } from '@/lib/authz';
import { acceptInvitation } from '@/lib/invitations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Accept an invitation. Requires an OTP-verified session; the account's phone must
// match the invitation's target (enforced inside acceptInvitation).
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const account = await currentAccount();
  if (!account) {
    return NextResponse.json({ ok: false, error: 'Verify your phone first, then open the invite' }, { status: 401 });
  }
  try {
    const result = await acceptInvitation({ token: params.token, accountId: account.id });
    return NextResponse.json({ ok: true, box: result.boxPublicId, role: result.role });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
