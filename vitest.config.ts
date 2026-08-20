import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // '@/…' path alias, matching tsconfig.
      '@': root.replace(/\/$/, ''),
      // 'server-only' throws when imported outside an RSC bundler; stub it in tests
      // so we can unit-test the pure helpers that live in server modules.
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
