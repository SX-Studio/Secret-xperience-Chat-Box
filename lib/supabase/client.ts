'use client';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

// Browser client (anon key). RLS denies it access to the Phase 1 tables; the UI
// talks to our own /api routes instead.
export function supabaseBrowser() {
  return createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey());
}
