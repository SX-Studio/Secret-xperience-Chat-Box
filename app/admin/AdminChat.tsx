'use client';
import { useState } from 'react';

// "Chat with Claude" bar from the wireframe — an operator assistant. The backend
// is a stub until an ANTHROPIC_API_KEY + tools are wired; it answers gracefully
// so the bar is present and honest rather than broken.
export default function AdminChat() {
  const [q, setQ] = useState('');
  const [log, setLog] = useState<{ role: 'you' | 'claude'; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = q.trim();
    if (!text) return;
    setLog((l) => [...l, { role: 'you', text }]);
    setQ('');
    setBusy(true);
    try {
      const r = await fetch('/api/admin/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }),
      });
      const j = await r.json().catch(() => ({}));
      setLog((l) => [...l, { role: 'claude', text: j.reply || 'No response.' }]);
    } catch {
      setLog((l) => [...l, { role: 'claude', text: 'Assistant unavailable.' }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="card" style={{ marginTop: 16, position: 'sticky', bottom: 8 }}>
      {log.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 8, fontSize: 13 }}>
          {log.map((m, i) => (
            <div key={i} style={{ margin: '4px 0' }}>
              <span className="mono dim" style={{ marginRight: 6 }}>{m.role === 'you' ? 'you' : 'claude'}</span>
              {m.text}
            </div>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 8 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Chat with Claude…"
          style={{ flex: 1 }}
        />
        <button onClick={send} disabled={busy}>{busy ? '…' : 'Send'}</button>
      </div>
    </div>
  );
}
