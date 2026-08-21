import 'server-only';
import { admin } from '@/lib/supabase/admin';
import { publicId } from '@/lib/ids';
import { writeAudit } from '@/lib/audit';
import { emit } from '@/lib/events';

// Pure — testable.
export function validateReportReason(raw: unknown): string {
  const r = String(raw ?? '').trim();
  if (r.length < 3 || r.length > 80) throw new Error('Reason must be 3–80 characters');
  return r;
}

export async function createReport(opts: {
  reporterId: string;
  targetType: 'content' | 'account';
  targetId: string;
  reason: string;
  details?: string | null;
}): Promise<string> {
  const { data, error } = await admin()
    .from('report')
    .insert({
      public_id: publicId('RPT'),
      reporter_id: opts.reporterId,
      target_type: opts.targetType,
      target_id: opts.targetId,
      reason: opts.reason,
      details: opts.details ?? null,
    })
    .select('public_id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'report failed');
  await writeAudit({ actorId: opts.reporterId, action: 'report.filed', targetType: opts.targetType, targetId: opts.targetId, metadata: { reason: opts.reason } });
  await emit('REPORT_FILED', { target_type: opts.targetType, target_id: opts.targetId });
  return (data as { public_id: string }).public_id;
}

export async function listReports() {
  const { data } = await admin()
    .from('report')
    .select('public_id, target_type, target_id, reason, details, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function resolveReport(reportPublicId: string, status: 'triaged' | 'actioned' | 'dismissed', moderatorId: string) {
  await admin().from('report').update({ status }).eq('public_id', reportPublicId);
  await writeAudit({ actorId: moderatorId, action: `report.${status}`, targetType: 'report', targetId: reportPublicId });
}
