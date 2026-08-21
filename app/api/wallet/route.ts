import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/authz';
import { getBalance, getLedger } from '@/lib/wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  const [balance, ledger] = await Promise.all([getBalance(account.id), getLedger(account.id)]);
  return NextResponse.json({ ok: true, balance, ledger });
}
