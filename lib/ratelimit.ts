import 'server-only';
import { admin } from '@/lib/supabase/admin';

// Simple DB-backed OTP rate limit: no more than `max` challenges for a phone within
// `windowMinutes`. Good enough for MVP; a Redis token bucket can replace it later.
export async function tooManyOtpRequests(phoneHash: string, windowMinutes = 15, max = 5): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await admin()
    .from('otp_challenge')
    .select('id', { count: 'exact', head: true })
    .eq('phone_hash', phoneHash)
    .gte('created_at', since);
  return (count ?? 0) >= max;
}
