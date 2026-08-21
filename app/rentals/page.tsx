'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Rental = {
  public_id: string;
  content_public_id: string;
  title: string;
  creator: string | null;
  expires_at: string;
  preview_url: string | null;
};

function fmt(iso: string): string {
  let s = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

export default function MyRentalsPage() {
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch('/api/rentals/my');
    if (r.status === 401) { router.push('/login?next=/rentals'); return; }
    if (r.ok) setRentals((await r.json()).rentals || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const iv = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(iv); }, []);

  async function view(contentId: string) {
    const r = await fetch(`/api/content/${contentId}/view`);
    if (r.ok) { const j = await r.json(); setUrls((u) => ({ ...u, [contentId]: j.url })); }
  }

  if (loading) return <div className="container"><p className="dim">Loading…</p></div>;

  return (
    <div className="container">
      <div className="between">
        <div>
          <p className="eyebrow">Library</p>
          <h1>My rentals</h1>
        </div>
        <a href="/app"><button className="ghost sm">← Dashboard</button></a>
      </div>

      {rentals.length === 0 ? (
        <div className="card"><p className="dim" style={{ margin: 0 }}>Nothing rented right now. Open a box feed and rent something — it appears here with a 24h timer.</p></div>
      ) : (
        <div className="feed-grid">
          {rentals.map((r) => (
            <div className="feed-card" key={r.public_id}>
              <div className="feed-media">
                {urls[r.content_public_id]
                  ? <img src={urls[r.content_public_id]} alt={r.title} />
                  : r.preview_url ? <img src={r.preview_url} alt="" /> : <div className="feed-noimg" />}
                <div className="feed-lock">🔓 expires in <span className="cd">{fmt(r.expires_at)}</span></div>
              </div>
              <div className="feed-body">
                <strong>{r.title}</strong>
                <div className="dim">{r.creator}</div>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="sm" onClick={() => view(r.content_public_id)}>{urls[r.content_public_id] ? 'Refresh' : 'View'}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .feed-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:14px}
        .feed-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
        .feed-media{position:relative;aspect-ratio:4/5;background:var(--surface-2)}
        .feed-media img{width:100%;height:100%;object-fit:cover;display:block}
        .feed-noimg{position:absolute;inset:0;background:linear-gradient(135deg,#2a2340,#141019)}
        .feed-lock{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;font-size:11px;color:#fff;background:linear-gradient(to top,rgba(6,7,12,.85),transparent)}
        .feed-body{padding:11px 12px}
        .cd{font-family:ui-monospace,monospace;color:var(--teal)}
      `}</style>
    </div>
  );
}
