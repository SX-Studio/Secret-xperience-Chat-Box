import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/supabase/admin';
import { verotelConfig, verifyPostback } from '@/lib/verotel';
import { applyWallet } from '@/lib/wallet';
import { writeAudit } from '@/lib/audit';
import { emit } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verotel FlexPay postback. Verifies the signature + shopID, then credits the
// buyer's wallet exactly once (idempotency key = the Verotel sale id). Verotel
// posts via GET; POST accepted for safety.
export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }

async function handle(req: NextRequest): Promise<NextResponse> {
  const cfg = verotelConfig();
  if (!cfg.configured) return new NextResponse('Not configured', { status: 503 });

  const params: Record<string, string> = {};
  if (req.method === 'GET') {
    req.nextUrl.searchParams.forEach((v, k) => (params[k] = v));
  } else {
    new URLSearchParams(await req.text()).forEach((v, k) => (params[k] = v));
  }

  if (!verifyPostback(params, String(cfg.key))) return new NextResponse('Invalid signature', { status: 400 });
  if (String(params.shopID) !== String(cfg.shopId)) return new NextResponse('Forbidden', { status: 403 });
  if ((params.type || '').toLowerCase() !== 'purchase') return new NextResponse('OK', { status: 200 });

  const orderId = params.custom1;
  const accountId = params.custom2;
  const saleId = params.saleID || params.referenceID || '';
  if (!orderId || !accountId || !saleId) return new NextResponse('Missing fields', { status: 400 });

  const { data: order } = await admin()
    .from('token_order')
    .select('id, public_id, account_id, tokens, status')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return new NextResponse('Order not found', { status: 404 });
  const o = order as { id: string; public_id: string; account_id: string; tokens: number; status: string };
  if (o.account_id !== accountId) return new NextResponse('Account mismatch', { status: 400 });
  if (o.status === 'paid') return new NextResponse('OK', { status: 200 }); // already handled

  // Idempotent credit — a retried postback with the same sale id is a no-op.
  await applyWallet({
    accountId,
    amount: o.tokens,
    type: 'purchase',
    refType: 'token_order',
    refId: o.public_id,
    idempotencyKey: `verotel:${saleId}`,
  });
  await admin().from('token_order').update({ status: 'paid', provider_ref: saleId, updated_at: new Date().toISOString() }).eq('id', o.id);
  await writeAudit({ actorId: accountId, action: 'tokens.credited', targetType: 'token_order', targetId: o.public_id, metadata: { tokens: o.tokens, saleId } });
  await emit('TOKENS_PURCHASED', { account_id: accountId, tokens: o.tokens, order: o.public_id });

  return new NextResponse('OK', { status: 200 });
}
