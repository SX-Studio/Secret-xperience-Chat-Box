import { NextRequest, NextResponse } from 'next/server';
import { currentAccount } from '@/lib/authz';
import { admin } from '@/lib/supabase/admin';
import { findPackage } from '@/lib/packages';
import { verotelConfig, buildStartOrderUrl } from '@/lib/verotel';
import { publicId } from '@/lib/ids';
import { writeAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Start a real token purchase via Verotel FlexPay. Creates a pending token_order
// and returns a signed hosted-payment URL. Graceful { configured:false } when the
// PSP env isn't set (client falls back to the dev top-up in pre-production).
export async function POST(req: NextRequest) {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { packageId } = (await req.json().catch(() => ({}))) as { packageId?: string };
  const pkg = packageId ? findPackage(packageId) : undefined;
  if (!pkg) return NextResponse.json({ ok: false, error: 'Unknown package' }, { status: 400 });

  const cfg = verotelConfig();
  if (!cfg.configured) return NextResponse.json({ configured: false });

  const { data: order, error } = await admin()
    .from('token_order')
    .insert({ public_id: publicId('ORD'), account_id: account.id, tokens: pkg.tokens, eur_cents: pkg.eurCents })
    .select('id, public_id')
    .single();
  if (error || !order) return NextResponse.json({ ok: false, error: 'Order failed' }, { status: 500 });

  const url = buildStartOrderUrl({
    shopId: String(cfg.shopId),
    key: String(cfg.key),
    priceEur: (pkg.eurCents / 100).toFixed(2),
    description: `${pkg.tokens} tokens - Content Box`, // ASCII only
    orderId: (order as { id: string }).id,
    accountId: account.id,
  });

  await writeAudit({ actorId: account.id, action: 'tokens.order', targetType: 'token_order', targetId: (order as { public_id: string }).public_id, metadata: { tokens: pkg.tokens } });
  return NextResponse.json({ configured: true, url });
}
