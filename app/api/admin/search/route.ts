import { NextRequest, NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { admin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// App-wide admin search across boxes, content, and accounts. Operator/moderator
// only. Never returns PII (accounts by public_id + status only — no phone).
export async function GET(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  const isAdmin = (await hasRole(account.id, 'platform_operator')) || (await hasRole(account.id, 'moderator'));
  if (!isAdmin) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ boxes: [], content: [], accounts: [] });
  const like = `%${q}%`;

  const [boxes, content, accounts] = await Promise.all([
    admin().from('box').select('public_id, name, status').or(`name.ilike.${like},public_id.ilike.${like}`).limit(6),
    admin().from('content').select('public_id, title, status').or(`title.ilike.${like},public_id.ilike.${like}`).limit(6),
    admin().from('account').select('public_id, status').ilike('public_id', like).limit(6),
  ]);

  return NextResponse.json({
    boxes: boxes.data ?? [],
    content: content.data ?? [],
    accounts: accounts.data ?? [],
  });
}
