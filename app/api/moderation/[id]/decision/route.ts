import { NextRequest, NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';
import { decideContent, type ModerationAction } from '@/lib/moderation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS: ModerationAction[] = ['approve', 'reject', 'suspend', 'delete'];

// Moderate one content item (id = content public id).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!(await hasRole(account.id, 'moderator'))) return NextResponse.json({ ok: false, error: 'Moderators only' }, { status: 403 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 }); }
  const raw = body as { action?: unknown; reason?: unknown };
  const action = String(raw?.action ?? '') as ModerationAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });

  try {
    await decideContent({ moderatorId: account.id, contentPublicId: params.id, action, reason: raw?.reason ? String(raw.reason).slice(0, 200) : undefined });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
