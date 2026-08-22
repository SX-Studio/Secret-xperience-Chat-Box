'use client';
import { useState } from 'react';

// Operator-only: add a phone number to the admin allowlist (it becomes/stays a
// platform_operator). The number is hashed server-side; plaintext never stored.
export default function AdminTools() {
  const [phone, setPhone] = useState('+32');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setMsg(null); setBusy(true);
    try {
      const r = await fetch('/api/admin/operators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, label }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error || 'Failed'); return; }
      setMsg(j.promoted ? 'Added — account promoted to operator.' : 'Added — will become operator on next login.');
      setLabel('');
    } catch {
      setMsg('Failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="card">
      <strong>Admin operators</strong>
      <p className="dim" style={{ fontSize: 13, marginTop: 4 }}>Add a phone number that should have admin (operator) access.</p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+32477704740" inputMode="tel" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label (optional)" />
        <button onClick={add} disabled={busy}>{busy ? 'Adding…' : 'Add operator'}</button>
      </div>
      {msg && <p className="dim" style={{ fontSize: 13 }}>{msg}</p>}
    </div>
  );
}
