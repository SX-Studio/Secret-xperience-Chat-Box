# Content Box

A **temporary multi-creator content rental marketplace**. Creators drop content into
a shared Box; users browse one feed, pay with tokens, and **rent an item for 24 hours** —
after which access expires automatically. Pseudonymous between participants, fully
controllable by the platform.

> Standalone product. Optional SecretXperience integration comes later.

## Status — Phase 1 (Identity & Box foundation)

This repo is being built in reviewable phases (see the architecture & build-plan docs).

- **Phase 1** — GSM/SMS-OTP auth, roles, boxes, invitations, audit skeleton ← _in progress_
- Phase 2 — content upload & processing, the blurred feed
- Phase 3 — wallet, tokens, rental engine, payouts
- Phase 4 — moderation console, AI screening, reports

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres + RLS, Storage, Edge Functions/cron (project `jpnnzxnvubrosjjcbkmn`)
- Provider-agnostic SMS adapter (stub in Phase 1)
- Vitest for tests

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys + generate crypto keys
npm run test                 # unit tests
npm run dev                  # http://localhost:3000
```

Generate the 32-byte crypto keys:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database

Migrations live in `supabase/migrations/` (`0001`–`0005`). Apply them to the Supabase
project via the SQL editor, the Supabase CLI, or the Supabase MCP. RLS is enabled on
every table; all access goes through server routes using the service-role key.

## Security posture (Phase 1)

- Phone numbers stored **encrypted** + keyed **HMAC** for lookup — never plaintext.
- Invitation tokens stored **hashed**, single-use, time-limited, revocable, phone-bound.
- **RLS on every table**, deny-by-default for the browser key.
- Every sensitive action writes to an **append-only audit log**.
- **No Stripe** for token purchase (prohibits adult content) — an adult-friendly PSP
  and the token legal analysis are a separate compliance track.
