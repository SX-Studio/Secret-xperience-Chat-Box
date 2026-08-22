import { NextRequest, NextResponse } from 'next/server';
import { currentAccount, hasRole } from '@/lib/authz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin assistant ("Chat with Claude"). Operator-only. Stub until ANTHROPIC_API_KEY
// + a tool layer are wired — answers gracefully so the bar works end-to-end now.
export async function POST(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  if (!(await hasRole(account.id, 'platform_operator'))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }
  const { message } = (await req.json().catch(() => ({}))) as { message?: string };
  if (!message) return NextResponse.json({ ok: false, error: 'Empty message' }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      reply: 'The admin assistant is not configured yet. Set ANTHROPIC_API_KEY to enable it.',
    });
  }
  // TODO: call the Anthropic API with read-only admin tools (box/platform stats).
  return NextResponse.json({ reply: 'Assistant is configured but the tool layer is not wired yet.' });
}
