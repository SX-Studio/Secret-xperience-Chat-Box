import 'server-only';
import { admin } from '@/lib/supabase/admin';

export type LedgerRow = {
  type: string;
  amount_tokens: number;
  ref_type: string | null;
  ref_id: string | null;
  balance_after: number;
  created_at: string;
};

// Pure — testable without a DB.
export function validateTopUpAmount(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 100_000) {
    throw new Error('Amount must be a whole number of tokens (1–100000)');
  }
  return n;
}

export async function getBalance(accountId: string): Promise<number> {
  const { data } = await admin().from('wallet').select('balance_tokens').eq('account_id', accountId).maybeSingle();
  return (data as { balance_tokens: number } | null)?.balance_tokens ?? 0;
}

// Atomic, idempotent balance change via the DB function. Throws on insufficient funds.
export async function applyWallet(opts: {
  accountId: string;
  amount: number;
  type: string;
  refType?: string | null;
  refId?: string | null;
  idempotencyKey?: string | null;
}): Promise<number> {
  const { data, error } = await admin().rpc('wallet_apply', {
    p_account: opts.accountId,
    p_amount: opts.amount,
    p_type: opts.type,
    p_ref_type: opts.refType ?? null,
    p_ref_id: opts.refId ?? null,
    p_idempotency_key: opts.idempotencyKey ?? null,
  });
  if (error) {
    if (error.message.includes('INSUFFICIENT_FUNDS')) throw new Error('Insufficient token balance');
    throw new Error(error.message);
  }
  return data as number;
}

export async function getLedger(accountId: string, limit = 50): Promise<LedgerRow[]> {
  const { data } = await admin()
    .from('ledger_entry')
    .select('type, amount_tokens, ref_type, ref_id, balance_after, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as LedgerRow[]) ?? [];
}
