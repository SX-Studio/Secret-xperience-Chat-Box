import 'server-only';
import { admin } from '@/lib/supabase/admin';

// Append-only audit trail. Every sensitive action calls this. Failures are logged
// but never block the primary action from returning.
export async function writeAudit(entry: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
}) {
  const { error } = await admin().from('audit_log').insert({
    actor_id: entry.actorId ?? null,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    metadata: entry.metadata ?? {},
    reason: entry.reason ?? null,
  });
  if (error) console.error('[audit] failed:', error.message);
}
