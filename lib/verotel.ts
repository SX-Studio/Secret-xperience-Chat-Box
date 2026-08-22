import 'server-only';
import { createHash } from 'crypto';

// Verotel FlexPay signature (proven algorithm):
//   text = SIGNATURE_KEY; for each param sorted case-insensitively by name
//   (excluding "signature" and empty values): text += ":" + name + "=" + value;
//   signature = lowercase(sha256(text)).
export function signParams(params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params)
    .filter((k) => k !== 'signature' && params[k] !== '' && params[k] != null)
    .sort((a, b) => {
      const la = a.toLowerCase();
      const lb = b.toLowerCase();
      return la < lb ? -1 : la > lb ? 1 : 0;
    });
  let text = secret;
  for (const k of keys) text += `:${k}=${params[k]}`;
  return createHash('sha256').update(text, 'utf8').digest('hex').toLowerCase();
}

export function verifyPostback(params: Record<string, string>, secret: string): boolean {
  const incoming = (params.signature || '').toLowerCase();
  if (!incoming) return false;
  return incoming === signParams(params, secret.trim());
}

export const FLEXPAY_START_URL = 'https://secure.verotel.com/startorder';

export function verotelConfig() {
  const shopId = process.env.VEROTEL_SHOP_ID;
  const key = process.env.VEROTEL_SIGNATURE_KEY;
  return { shopId, key, configured: Boolean(shopId && key) };
}

// success/decline URLs are configured in the Verotel panel (FlexPay options), NOT
// passed here — passing them breaks the signature. Description must be ASCII.
export function buildStartOrderUrl(opts: {
  shopId: string; key: string; priceEur: string; description: string; orderId: string; accountId: string;
}): string {
  const params: Record<string, string> = {
    shopID: opts.shopId,
    priceAmount: opts.priceEur,
    priceCurrency: 'EUR',
    type: 'purchase',
    description: opts.description,
    custom1: opts.orderId,
    custom2: opts.accountId,
    version: '4',
  };
  params.signature = signParams(params, opts.key.trim());
  return `${FLEXPAY_START_URL}?${new URLSearchParams(params).toString()}`;
}
