import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

// Service-role client. Bypasses RLS — use ONLY in server routes / server actions,
// never in a component that could ship to the browser. This is the sole path that
// reads or writes the Phase 1 tables (see supabase/migrations/0005_rls_policies.sql).
let cached: SupabaseClient | null = null;

export function admin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
