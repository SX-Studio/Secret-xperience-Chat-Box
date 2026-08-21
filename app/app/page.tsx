'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Me = { account: { public_id: string; status: string }; roles: { role: string; box_id: string | null }[] };
type Box = { public_id: string; name: string; description: string | null; status: string; role?: string };

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);

  const isOperator = !!me?.roles.some((r) => r.role === 'platform_operator');
  const canAdmin = (b: Box) => isOperator || b.role === 'box_admin';

  const loadBoxes = useCallback(async () => {
    const r = await fetch('/api/boxes');
    if (r.ok) setBoxes((await r.json()).boxes || []);
  }, []);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/me');
      if (r.status === 401) { router.push('/login?next=/app'); return; }
      setMe(await r.json());
      await loadBoxes();
      setLoading(false);
    })();
  }, [router, loadBoxes]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) return <div className="container"><p className="dim">Loading…</p></div>;

  return (
    <div className="container">
      <div className="between">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 style={{ marginBottom: 2 }}><span className="mono" style={{ fontSize: 22 }}>{me?.account.public_id}</span></h1>
          <div className="row" style={{ marginTop: 6 }}>
            {me?.roles.length ? me.roles.map((r, i) => (
              <span key={i} className="pill">{r.role}{r.box_id ? ' · box' : ''}</span>
            )) : <span className="dim">No roles yet</span>}
          </div>
        </div>
        <button className="ghost sm" onClick={logout}>Sign out</button>
      </div>

      {isOperator && <CreateBox onCreated={loadBoxes} />}

      <h2 style={{ marginTop: 26 }}>Your boxes</h2>
      {boxes.length === 0 ? (
        <div className="card"><p className="dim" style={{ margin: 0 }}>No boxes yet.{isOperator ? ' Create one above.' : ' You’ll see a box here once you’re invited to one.'}</p></div>
      ) : (
        boxes.map((b) => (
          <div className="card" key={b.public_id}>
            <div className="between">
              <div>
                <strong>{b.name}</strong> {b.role && <span className="tag">· {b.role}</span>}
                <div className="dim"><span className="mono">{b.public_id}</span>{b.description ? ` — ${b.description}` : ''}</div>
              </div>
              <a href={`/box/${b.public_id}`}><button className="ghost sm">Open feed →</button></a>
            </div>
            {canAdmin(b) && <Invite boxId={b.public_id} />}
          </div>
        ))
      )}
    </div>
  );
}

function CreateBox({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/boxes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc || null }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not create box');
      setName(''); setDesc(''); setMsg({ kind: 'ok', text: `Created ${j.box.public_id}` });
      onCreated();
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>Create a box</h2>
      <label htmlFor="bn">Name</label>
      <input id="bn" placeholder="African Girls" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="bd">Description (optional)</label>
      <input id="bd" placeholder="A shared content room" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="row" style={{ marginTop: 16 }}><button disabled={busy || !name}>{busy ? 'Creating…' : 'Create box'}</button></div>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
    </form>
  );
}

function Invite({ boxId }: { boxId: string }) {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('creator');
  const [msg, setMsg] = useState<{ kind: 'err' | 'ok'; text: string } | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null); setLink(null);
    try {
      const r = await fetch(`/api/boxes/${boxId}/invitations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not send invitation');
      setMsg({ kind: 'ok', text: `Invitation ${j.invitation.public_id} sent (${role}).` });
      if (j.dev?.link) setLink(j.dev.link);
      setPhone('');
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <>
      <hr />
      <form onSubmit={submit}>
        <div className="dim" style={{ fontWeight: 600 }}>Invite someone</div>
        <div className="row" style={{ marginTop: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label htmlFor={`p-${boxId}`}>Phone (E.164)</label>
            <input id={`p-${boxId}`} placeholder="+31612345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div style={{ flex: '0 0 130px' }}>
            <label htmlFor={`r-${boxId}`}>Role</label>
            <select id={`r-${boxId}`} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="creator">creator</option>
              <option value="user">user</option>
            </select>
          </div>
          <button className="sm" disabled={busy || !phone}>{busy ? 'Sending…' : 'Invite'}</button>
        </div>
      </form>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
      {link && (
        <div>
          <div className="dim" style={{ marginTop: 8 }}>Preview invite link (dev only — normally sent by SMS):</div>
          <code className="link">{link}</code>
        </div>
      )}
    </>
  );
}
