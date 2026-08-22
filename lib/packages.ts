// Token packages for purchase. Tokens = euros × tokens_per_euro (100 → 100 tok/€).
export type TokenPackage = { id: string; tokens: number; eurCents: number; label: string };

export const PACKAGES: TokenPackage[] = [
  { id: 'starter', tokens: 500, eurCents: 500, label: 'Starter' },
  { id: 'casual', tokens: 1000, eurCents: 1000, label: 'Casual' },
  { id: 'patron', tokens: 2500, eurCents: 2500, label: 'Patron' },
];

export function findPackage(id: string): TokenPackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}
