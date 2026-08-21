import { NextRequest, NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { resolveReport } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['triaged', 'actioned', 'dismissed'] as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!(await hasRole(account.id, 'moderator'))) return NextResponse.json({ ok: false, error: 'Moderators only' }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 }); }
  const status = String((body as { status?: unknown })?.status ?? '') as (typeof STATUSES)[number];
  if (!STATUSES.includes(status)) return NextResponse.json({ ok: false, error: 'Invalid status' }, { status: 400 });

  await resolveReport(params.id, status, account.id);
  return NextResponse.json({ ok: true });
}
