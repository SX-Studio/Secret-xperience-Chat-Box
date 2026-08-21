import { NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { listModerationQueue } from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!(await hasRole(account.id, 'moderator'))) return NextResponse.json({ ok: false, error: 'Moderators only' }, { status: 403 });
  const queue = await listModerationQueue();
  return NextResponse.json({ ok: true, queue });
}
