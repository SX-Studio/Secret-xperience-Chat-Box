import Link from 'next/link';

export default function Home() {
  return (
    <div className="center">
      <p className="eyebrow">Content Box</p>
      <h1>Temporary content, shared boxes.</h1>
      <p className="muted">
        Creators drop content into a shared Box. Members browse one feed and rent for 24 hours.
        Sign in with your phone number to continue.
      </p>
      <div className="row" style={{ marginTop: 20 }}>
        <Link href="/login"><button>Sign in</button></Link>
      </div>
      <p className="dim" style={{ marginTop: 28 }}>Phase 1 — identity &amp; boxes. Content, wallet and rentals come next.</p>
    </div>
  );
}
