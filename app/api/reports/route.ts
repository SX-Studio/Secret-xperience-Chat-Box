import { NextRequest, NextResponse } from 'next/server';
import { currentAccount } from '@/lib/authz';
import { createReport, validateReportReason } from '@/lib/reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Any signed-in user can report a content item.
export async function POST(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 }); }
  const raw = body as { contentId?: unknown; reason?: unknown; details?: unknown };
  const targetId = String(raw?.contentId ?? '').trim();
  if (!targetId) return NextResponse.json({ ok: false, error: 'Missing content id' }, { status: 400 });

  let reason: string;
  try { reason = validateReportReason(raw?.reason); } catch (e) { return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 }); }

  const id = await createReport({
    reporterId: account.id,
    targetType: 'content',
    targetId,
    reason,
    details: raw?.details ? String(raw.details).slice(0, 500) : null,
  });
  return NextResponse.json({ ok: true, report: id }, { status: 201 });
}
