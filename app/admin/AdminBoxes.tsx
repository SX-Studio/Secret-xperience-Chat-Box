'use client';
import { useMemo, useState } from 'react';

export type BoxStat = {
  box_id: string;
  public_id: string;
  name: string;
  status: string;
  users: number;
  drops: number;
  rentals: number;
  tokens_in: number;
  creator_tokens: number;
  platform_tokens: number;
};

// "Various groups / Box Page": searchable row of box-group cards; click a card to
// expand its per-box performance (in / out / total / earning / users) — the
// wireframe's right-click "quick overview" made a tap-to-expand for touch.
export default function AdminBoxes({ boxes }: { boxes: BoxStat[] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return boxes;
    return boxes.filter((b) => b.name.toLowerCase().includes(s) || b.public_id.toLowerCase().includes(s));
  }, [q, boxes]);

  return (
    <div>
      <div className="between" style={{ margin: '4px 0 8px', alignItems: 'center' }}>
        <strong>Box groups</strong>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search boxes…" style={{ maxWidth: 220 }} />
      </div>

      {filtered.length === 0 ? (
        <div className="card"><p className="dim" style={{ margin: 0 }}>No boxes.</p></div>
      ) : (
        <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
          {filtered.map((b) => {
            const isOpen = open === b.box_id;
            return (
              <div className="card" key={b.box_id} style={{ flex: '1 1 220px', minWidth: 220, cursor: 'pointer' }}
                   onClick={() => setOpen(isOpen ? null : b.box_id)}>
                <div className="between">
                  <strong>{b.name}</strong>
                  <span className="pill">{b.status}</span>
                </div>
                <div className="dim mono" style={{ fontSize: 11 }}>{b.public_id}</div>
                <div className="row" style={{ gap: 12, marginTop: 8, fontSize: 13 }}>
                  <span>👤 {b.users}</span>
                  <span>🖼 {b.drops}</span>
                  <span>⏱ {b.rentals}</span>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--line,#2a2a2a)', paddingTop: 8, fontSize: 13 }}>
                    <Row label="In (tokens)" value={b.tokens_in} />
                    <Row label="Creator earning" value={b.creator_tokens} />
                    <Row label="Platform (out)" value={b.platform_tokens} />
                    <Row label="Total drops" value={b.drops} />
                    <Row label="Users" value={b.users} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="between" style={{ padding: '2px 0' }}>
      <span className="dim">{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
