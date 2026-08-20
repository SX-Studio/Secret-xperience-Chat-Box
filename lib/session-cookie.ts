import 'server-only';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySessionToken } from '@/lib/session';

// Cookie side of the session — kept separate from the pure sign/verify so those stay
// testable without next/headers. httpOnly + secure + sameSite=lax.
export async function setSessionCookie(sub: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(sub), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

export async function getSessionSub(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token)?.sub ?? null;
}
