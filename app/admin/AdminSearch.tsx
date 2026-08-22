'use client';
import { useEffect, useRef, useState } from 'react';

type Results = {
  boxes: { public_id: string; name: string; status: string }[];
  content: { public_id: string; title: string; status: string }[];
  accounts: { public_id: string; status: string }[];
};
const EMPTY: Results = { boxes: [], content: [], accounts: [] };

// App-wide admin search (boxes / content / accounts). Debounced; results dropdown.
export default function AdminSearch() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) { setRes(EMPTY); return; }
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`);
        if (r.ok) { setRes(await r.json()); setOpen(true); }
      } catch { /* ignore */ }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q]);

  const total = res.boxes.length + res.content.length + res.accounts.length;

  return (
    <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="🔍 Search app (boxes, content, accounts)…"
        style={{ width: '100%' }}
      />
      {open && q.trim().length >= 2 && (
        <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, maxHeight: 320, overflowY: 'auto' }}>
          {total === 0 ? <p className="dim" style={{ margin: 0, fontSize: 13 }}>No matches.</p> : (
            <>
              <Group title="Boxes" items={res.boxes.map((b) => ({ id: b.public_id, main: b.name, sub: `${b.public_id} · ${b.status}` }))} />
              <Group title="Content" items={res.content.map((c) => ({ id: c.public_id, main: c.title, sub: `${c.public_id} · ${c.status}` }))} />
              <Group title="Accounts" items={res.accounts.map((a) => ({ id: a.public_id, main: a.public_id, sub: a.status }))} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ title, items }: { title: string; items: { id: string; main: string; sub: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="dim mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{title}</div>
      {items.map((it) => (
        <div key={it.id} style={{ padding: '4px 0', fontSize: 13 }}>
          {it.main} <span className="dim mono" style={{ fontSize: 11 }}>· {it.sub}</span>
        </div>
      ))}
    </div>
  );
}
