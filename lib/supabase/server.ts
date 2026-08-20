import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Anon SSR client bound to the request cookies. In Phase 1 this reaches almost
// nothing (RLS denies the anon role) — it exists so Phase 2 can attach our own
// session. Next.js 14: cookies() is async.
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet: CookieToSet[]) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component render — safe to ignore
        }
      },
    },
  });
}
