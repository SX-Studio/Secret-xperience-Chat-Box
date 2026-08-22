import { requireAdminStepUp } from '@/lib/admin-stepup';

// Gate the moderation console behind the admin fingerprint (step-up): must be an
// operator/moderator AND have a fresh WebAuthn unlock, else redirected to
// /admin/unlock. The console page itself is unchanged.
export const dynamic = 'force-dynamic';

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  await requireAdminStepUp();
  return <>{children}</>;
}
