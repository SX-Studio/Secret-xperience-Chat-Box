import { NextRequest, NextResponse } from 'next/server';
import { expireRentals } from '@/lib/rentals';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Scheduled expiry sweep. Secret-gated: Vercel Cron sends `Authorization: Bearer
// $CRON_SECRET`; x-cron-secret / ?secret also accepted. No secret set → disabled.
export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }

async function run(req: NextRequest): Promise<NextResponse> {
  const secret = env.cronSecret();
  if (!secret) return NextResponse.json({ ok: false, error: 'Disabled' }, { status: 503 });

  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || bearer;
  if (provided !== secret) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const expired = await expireRentals();
  return NextResponse.json({ ok: true, expired });
}
