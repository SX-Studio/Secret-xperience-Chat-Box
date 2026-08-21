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

function fmtCountdown(iso: string): string {
  let s = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return `${p(h)}:${p(m)}:${p(sec)}`;
}

export default function BoxPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const boxId = params.id;
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [rented, setRented] = useState<Record<string, string>>({}); // content_public_id -> expires_at
  const [ctx, setCtx] = useState<Ctx>({ canUpload: false, boxName: boxId });
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    const [f, m] = await Promise.all([fetch(`/api/boxes/${boxId}/feed`), fetch('/api/rentals/my')]);
    if (f.status === 401) { router.push(`/login?next=/box/${boxId}`); return; }
    if (f.ok) setFeed((await f.json()).feed || []);
    if (m.ok) {
      const map: Record<string, string> = {};
      for (const r of (await m.json()).rentals || []) map[r.content_public_id] = r.expires_at;
      setRented(map);
    }
  }, [boxId, router]);

  useEffect(() => {
    (async () => {
      const [meRes, boxRes] = await Promise.all([fetch('/api/me'), fetch(`/api/boxes/${boxId}`)]);
      if (meRes.status === 401) { router.push(`/login?next=/box/${boxId}`); return; }
      const me = await meRes.json();
      const box = boxRes.ok ? (await boxRes.json()).box : null;
      const isOperator = !!me.roles?.some((r: { role: string }) => r.role === 'platform_operator');
      setCtx({ canUpload: isOperator || box?.role === 'creator' || box?.role === 'box_admin', boxName: box?.name || boxId });
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
        <div className="row">
          <a href="/rentals"><button className="ghost sm">My rentals</button></a>
          <a href="/app"><button className="ghost sm">← Dashboard</button></a>
        </div>
      </div>

      {ctx.canUpload && <Upload boxId={boxId} onUploaded={loadFeed} />}

      <h2 style={{ marginTop: 26 }}>Feed</h2>
      {feed.length === 0 ? (
        <div className="card"><p className="dim" style={{ margin: 0 }}>No content yet.{ctx.canUpload ? ' Drop something above.' : ' Check back soon.'}</p></div>
      ) : (
        <div className="feed-grid">
          {feed.map((c) => (
            <RentableCard key={c.public_id} item={c} initialExpiry={rented[c.public_id] || null} />
          ))}
        </div>
      )}

    </div>
  );
}

function RentableCard({ item, initialExpiry }: { item: FeedItem; initialExpiry: string | null }) {
  const [expiry, setExpiry] = useState<string | null>(initialExpiry);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!expiry) return;
    const iv = setInterval(() => {
      if (new Date(expiry).getTime() <= Date.now()) { setExpiry(null); setUrl(null); }
      else setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(iv);
  }, [expiry]);

  async function rent() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/content/${item.public_id}/rent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: `${item.public_id}:${Date.now()}` }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not rent');
      setExpiry(j.expiresAt);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function view() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/content/${item.public_id}/view`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not open');
      setUrl(j.url);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function report() {
    const reason = window.prompt('Why are you reporting this content? (3–80 chars)');
    if (!reason) return;
    const r = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentId: item.public_id, reason }) });
    setErr(r.ok ? null : ((await r.json()).error || 'Could not report'));
    if (r.ok) alert('Reported — thank you. Our team will review it.');
  }

  const isRented = !!expiry;
  return (
    <div className="feed-card">
      <div className="feed-media">
        {url
          ? <img src={url} alt={item.title} />
          : item.preview_url
          ? <img src={item.preview_url} alt="" loading="lazy" />
          : <div className="feed-noimg" />}
        <div className="feed-lock">
          {isRented ? <>🔓 Rented · <span className="cd">{fmtCountdown(expiry!)}</span></> : <>🔒 Blurred preview</>}
        </div>
      </div>
      <div className="feed-body">
        <strong>{item.title}</strong>
        <div className="dim">{item.creator} · {item.asset_count} photo{item.asset_count === 1 ? '' : 's'}</div>
        <div className="row between" style={{ marginTop: 8 }}>
          <span className="price">◈ {item.price_tokens}</span>
          {isRented
            ? <button className="sm" onClick={view} disabled={busy}>{busy ? '…' : url ? 'Refresh' : 'View'}</button>
            : <button className="sm" onClick={rent} disabled={busy}>{busy ? '…' : 'Rent 24h'}</button>}
        </div>
        {err && <div className="msg err" style={{ marginTop: 8 }}>{err}</div>}
        <button onClick={report} className="ghost" style={{ marginTop: 8, padding: '4px 8px', fontSize: 11, background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}>⚑ Report</button>
      </div>
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
      fd.set('boxId', boxId); fd.set('title', title); fd.set('price', price); fd.set('file', file);
      const r = await fetch('/api/content', { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Upload failed');
      setMsg({ kind: 'ok', text: `Posted ${j.content.public_id}` });
      setTitle(''); setFile(null);
      const el = document.getElementById(`file-${boxId}`) as HTMLInputElement | null;
      if (el) el.value = '';
      onUploaded();
    } catch (err) { setMsg({ kind: 'err', text: (err as Error).message }); } finally { setBusy(false); }
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
