'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type FeedItem = {
  public_id: string;
  title: string;
  description: string | null;
  price_tokens: number;
  creator: string | null;
  asset_count: number;
  preview_url: string | null;
};
type Ctx = { canUpload: boolean; boxName: string };

export default function BoxPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const boxId = params.id;
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [ctx, setCtx] = useState<Ctx>({ canUpload: false, boxName: boxId });
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    const r = await fetch(`/api/boxes/${boxId}/feed`);
    if (r.status === 401) { router.push(`/login?next=/box/${boxId}`); return; }
    if (r.ok) setFeed((await r.json()).feed || []);
  }, [boxId, router]);

  useEffect(() => {
    (async () => {
      // Figure out if the viewer can upload (creator/box_admin/operator) from /api/me.
      const [meRes, boxRes] = await Promise.all([fetch('/api/me'), fetch(`/api/boxes/${boxId}`)]);
      if (meRes.status === 401) { router.push(`/login?next=/box/${boxId}`); return; }
      const me = await meRes.json();
      const box = boxRes.ok ? (await boxRes.json()).box : null;
      const isOperator = !!me.roles?.some((r: { role: string }) => r.role === 'platform_operator');
      const canUpload = isOperator || box?.role === 'creator' || box?.role === 'box_admin';
      setCtx({ canUpload, boxName: box?.name || boxId });
      await loadFeed();
      setLoading(false);
    })();
  }, [boxId, router, loadFeed]);

  if (loading) return <div className="container"><p className="dim">Loading…</p></div>;

  return (
    <div className="container">
      <div className="between">
        <div>
          <p className="eyebrow">Box</p>
          <h1 style={{ marginBottom: 2 }}>{ctx.boxName}</h1>
          <div className="dim mono">{boxId}</div>
        </div>
        <a href="/app"><button className="ghost sm">← Dashboard</button></a>
      </div>

      {ctx.canUpload && <Upload boxId={boxId} onUploaded={loadFeed} />}

      <h2 style={{ marginTop: 26 }}>Feed</h2>
      {feed.length === 0 ? (
        <div className="card"><p className="dim" style={{ margin: 0 }}>No content yet.{ctx.canUpload ? ' Drop something above.' : ' Check back soon.'}</p></div>
      ) : (
        <div className="feed-grid">
          {feed.map((c) => (
            <div className="feed-card" key={c.public_id}>
              <div className="feed-media">
                {c.preview_url
                  ? <img src={c.preview_url} alt="" loading="lazy" />
                  : <div className="feed-noimg" />}
                <div className="feed-lock">🔒 Blurred preview</div>
              </div>
              <div className="feed-body">
                <strong>{c.title}</strong>
                <div className="dim">{c.creator} · {c.asset_count} photo{c.asset_count === 1 ? '' : 's'}</div>
                <div className="row between" style={{ marginTop: 8 }}>
                  <span className="price">◈ {c.price_tokens}</span>
                  <button className="sm" disabled title="Renting arrives in Phase 3">Rent 24h</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .feed-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-top:8px}
        .feed-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}
        .feed-media{position:relative;aspect-ratio:4/5;background:var(--surface-2)}
        .feed-media img{width:100%;height:100%;object-fit:cover;display:block}
        .feed-noimg{position:absolute;inset:0;background:linear-gradient(135deg,#2a2340,#141019)}
        .feed-lock{position:absolute;left:0;right:0;bottom:0;padding:8px 10px;font-size:11px;color:#fff;background:linear-gradient(to top,rgba(6,7,12,.8),transparent)}
        .feed-body{padding:11px 12px}
        .price{font-family:ui-monospace,monospace;color:var(--teal);font-weight:600}
      `}</style>
    </div>
  );
}

function Upload({ boxId, onUploaded }: { boxId: string; onUploaded: () => void }) {
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('250');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.set('boxId', boxId);
      fd.set('title', title);
      fd.set('price', price);
      fd.set('file', file);
      const r = await fetch('/api/content', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setMsg({ kind: 'ok', text: `Posted ${j.content.public_id}` });
      setTitle(''); setFile(null);
      (document.getElementById(`file-${boxId}`) as HTMLInputElement | null)?.value && ((document.getElementById(`file-${boxId}`) as HTMLInputElement).value = '');
      onUploaded();
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>Drop content</h2>
      <label htmlFor={`file-${boxId}`}>Image (JPEG / PNG / WebP, max 15MB)</label>
      <input id={`file-${boxId}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label htmlFor={`t-${boxId}`}>Title</label>
          <input id={`t-${boxId}`} placeholder="Nairobi Weekend" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <label htmlFor={`pr-${boxId}`}>Price (tokens)</label>
          <input id={`pr-${boxId}`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
        </div>
      </div>
      <div className="row" style={{ marginTop: 16 }}>
        <button disabled={busy || !file || !title}>{busy ? 'Uploading…' : 'Post to feed'}</button>
      </div>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
    </form>
  );
}
