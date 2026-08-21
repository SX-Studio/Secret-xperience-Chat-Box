import 'server-only';
import { admin } from '@/lib/supabase/admin';
import { writeAudit } from '@/lib/audit';
import { emit } from '@/lib/events';

export type RiskLevel = 'low' | 'uncertain' | 'high';
export type ScreenResult = { riskLevel: RiskLevel; flags: Record<string, number> };

// Stub AI screen. A real provider implements this signature later; for now it returns
// low risk with zeroed flags. AI is ASSISTIVE — a human can always review, suspend, or
// delete regardless of what the screen said.
export async function screenImage(_buf: Buffer, _mime: string): Promise<ScreenResult> {
  return { riskLevel: 'low', flags: { csam: 0, nonconsent: 0, stolen: 0, malware: 0 } };
}

export async function createModerationCase(contentId: string, screen: ScreenResult, autoApprove: boolean) {
  await admin().from('moderation_case').insert({
    content_id: contentId,
    status: autoApprove ? 'approved' : 'pending_review',
    risk_level: screen.riskLevel,
    ai_flags: screen.flags,
    decided_at: autoApprove ? new Date().toISOString() : null,
  });
}

const ACTION_TO_STATUS = { approve: 'approved', reject: 'rejected', suspend: 'suspended', delete: 'deleted' } as const;
export type ModerationAction = keyof typeof ACTION_TO_STATUS;

export async function decideContent(opts: { moderatorId: string; contentPublicId: string; action: ModerationAction; reason?: string }) {
  const status = ACTION_TO_STATUS[opts.action];
  const { data: content } = await admin().from('content').select('id, public_id').eq('public_id', opts.contentPublicId).maybeSingle();
  if (!content) throw new Error('Content not found');
  const contentId = (content as { id: string }).id;

  await admin().from('content').update({ status }).eq('id', contentId);
  await admin().from('moderation_case').update({ status, decided_by: opts.moderatorId, decided_at: new Date().toISOString(), reason: opts.reason ?? null }).eq('content_id', contentId);
  await writeAudit({ actorId: opts.moderatorId, action: `moderation.${opts.action}`, targetType: 'content', targetId: opts.contentPublicId, reason: opts.reason });
  await emit('CONTENT_MODERATED', { content_id: contentId, action: opts.action });
}

export async function listModerationQueue() {
  const { data } = await admin()
    .from('moderation_case')
    .select('status, risk_level, ai_flags, created_at, content:content_id ( public_id, title, status, creator:creator_id ( public_id ), box:box_id ( public_id, name ) )')
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

// Signed URL of the master for review — authorized and audit-logged.
export async function moderationOriginalUrl(contentPublicId: string, moderatorId: string): Promise<string | null> {
  const { data: content } = await admin().from('content').select('id, public_id').eq('public_id', contentPublicId).maybeSingle();
  if (!content) return null;
  const { data: asset } = await admin().from('content_asset').select('storage_path').eq('content_id', (content as { id: string }).id).order('position', { ascending: true }).limit(1).maybeSingle();
  if (!asset) return null;
  const { data: signed } = await admin().storage.from('master').createSignedUrl((asset as { storage_path: string }).storage_path, 120);
  await writeAudit({ actorId: moderatorId, action: 'moderation.viewed_original', targetType: 'content', targetId: (content as { public_id: string }).public_id });
  return signed?.signedUrl ?? null;
}
