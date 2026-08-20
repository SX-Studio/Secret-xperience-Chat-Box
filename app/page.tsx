export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px' }}>
      <p style={{ fontFamily: 'monospace', letterSpacing: '0.18em', color: 'var(--ink-2)', textTransform: 'uppercase', fontSize: 12 }}>
        Content Box
      </p>
      <h1 style={{ fontSize: 34, lineHeight: 1.1, margin: '8px 0 16px' }}>
        Phase 1 — Identity &amp; Box foundation
      </h1>
      <p style={{ color: 'var(--ink-2)' }}>
        Standalone project scaffold. Auth, boxes and invitations are being built in
        reviewable chunks. This placeholder confirms the app builds.
      </p>
    </main>
  );
}
