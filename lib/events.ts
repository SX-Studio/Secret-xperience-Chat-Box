import 'server-only';
import { admin } from '@/lib/supabase/admin';

// Append to the event backbone (Postgres stands in for Kafka at MVP scale).
// Phase 1 has no consumers yet; this lays the rails for later phases to react.
export async function emit(type: string, payload: Record<string, unknown> = {}) {
  const { error } = await admin().from('events').insert({ type, payload });
  if (error) console.error('[events] failed:', error.message);
}
