import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { currentAccount } from '@/lib/authz';
import { rentContent } from '@/lib/rentals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Rent a content item for 24h. The client may send a stable idempotencyKey so a retry
// doesn't double-charge; the DB also enforces one active rental per (user, content).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  let key = randomUUID();
  try {
    const body = await req.json();
    if (typeof body?.idempotencyKey === 'string' && body.idempotencyKey.length <= 100) key = body.idempotencyKey;
  } catch {
    /* no body is fine */
  }

  try {
    const r = await rentContent(account.id, params.id, key);
    return NextResponse.json({ ok: true, rental: r.rentalPublicId, expiresAt: r.expiresAt, price: r.price }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
