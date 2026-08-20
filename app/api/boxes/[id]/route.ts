import { NextRequest, NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { getBoxForAccount } from '@/lib/boxes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Box detail by public id (BOX-…). Gated to members, or any platform operator.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  const isOperator = await hasRole(account.id, 'platform_operator');
  const box = await getBoxForAccount(params.id, account.id, isOperator);
  if (!box) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, box });
}
