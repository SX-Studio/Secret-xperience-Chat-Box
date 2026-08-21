import { NextRequest, NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { moderationOriginalUrl } from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Signed URL of the master for review — moderators only, and the access is audit-logged
// inside moderationOriginalUrl.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!(await hasRole(account.id, 'moderator'))) return NextResponse.json({ ok: false, error: 'Moderators only' }, { status: 403 });
  const url = await moderationOriginalUrl(params.id, account.id);
  if (!url) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, url });
}
