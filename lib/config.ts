import 'server-only';
import { admin } from '@/lib/supabase/admin';

// Runtime config read from app_config, with the locked defaults as fallback so the
// app works even before the seed row exists. Values are DB-configurable (no deploy
// needed to change token economics). Phase 3 consumes tokens_per_euro etc.
const DEFAULTS: Record<string, unknown> = {
  tokens_per_euro: 100,
  creator_split: 0.8,
  payout_threshold_eur: 50,
  rental_hours: 24,
  invitation_ttl_hours: 72,
};

export async function getConfig<T = unknown>(key: keyof typeof DEFAULTS | string): Promise<T> {
  const { data } = await admin().from('app_config').select('value').eq('key', key).maybeSingle();
  return (data?.value ?? DEFAULTS[key]) as T;
}
