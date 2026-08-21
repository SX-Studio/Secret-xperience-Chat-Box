import { NextResponse } from 'next/server';
import { currentAccount } from '@/lib/authz';
import { listMyRentals } from '@/lib/rentals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  const rentals = await listMyRentals(account.id);
  return NextResponse.json({ ok: true, rentals });
}
