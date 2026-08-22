import { requireAdminStepUp } from '@/lib/admin-stepup';
import { admin } from '@/lib/supabase/admin';
import AdminBoxes, { type BoxStat } from './AdminBoxes';
import AdminTools from './AdminTools';
import AdminChat from './AdminChat';

export const dynamic = 'force-dynamic';

type PlatformStats = {
  accounts: number; boxes: number; content: number; drops_last_hour: number;
  rentals: number; active_rentals: number; tokens_in_circulation: number;
  creator_tokens: number; platform_tokens: number; open_reports: number;
};

const n = (v: unknown) => Number(v ?? 0);

export default async function AdminDashboard() {
  const account = await requireAdminStepUp();

  const [{ data: ps }, { data: bs }] = await Promise.all([
    admin().from('platform_stats').select('*').maybeSingle(),
    admin().from('box_stats').select('*').order('name'),
  ]);

  const s = (ps ?? {}) as Partial<PlatformStats>;
  const boxes: BoxStat[] = (bs ?? []).map((b) => ({
    box_id: String(b.box_id), public_id: String(b.public_id), name: String(b.name), status: String(b.status),
    users: n(b.users), drops: n(b.drops), rentals: n(b.rentals),
    tokens_in: n(b.tokens_in), creator_tokens: n(b.creator_tokens), platform_tokens: n(b.platform_tokens),
  }));

  const overview: [string, number][] = [
    ['Accounts', n(s.accounts)],
    ['Boxes', n(s.boxes)],
    ['Content', n(s.content)],
    ['Drops (last 1h)', n(s.drops_last_hour)],
    ['Active rentals', n(s.active_rentals)],
    ['Open reports', n(s.open_reports)],
  ];
  const tokens: [string, number][] = [
    ['Tokens in circulation', n(s.tokens_in_circulation)],
    ['Creator earnings', n(s.creator_tokens)],
    ['Platform earnings', n(s.platform_tokens)],
  ];

  return (
    <div className="container" style={{ maxWidth: 940 }}>
      {/* Top bar */}
      <div className="between">
        <div><p className="eyebrow">Backend · admin use</p><h1>Admin dashboard</h1></div>
        <div className="row">
          <a href="/moderation"><button className="ghost sm">Moderation ↗</button></a>
          <a href="/app"><button className="ghost sm">App ↗</button></a>
        </div>
      </div>
      <p className="dim mono" style={{ fontSize: 12 }}>{account.public_id} · fingerprint-verified session · {n(s.drops_last_hour)} new drops in the last hour</p>

      {/* Dashboard — total overview / performance for the entire application */}
      <div className="card" style={{ marginTop: 12 }}>
        <strong>Total overview</strong>
        <p className="dim" style={{ fontSize: 12, marginTop: 2 }}>Performance across the entire application.</p>
        <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          {overview.map(([label, v]) => <Stat key={label} label={label} value={v} />)}
        </div>
      </div>

      {/* Tokens / SX */}
      <div className="card" style={{ marginTop: 12 }}>
        <strong>Tokens</strong>
        <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          {tokens.map(([label, v]) => <Stat key={label} label={label} value={v} accent />)}
        </div>
      </div>

      {/* Box groups */}
      <div style={{ marginTop: 16 }}>
        <AdminBoxes boxes={boxes} />
      </div>

      {/* Operators */}
      <div style={{ marginTop: 16 }}>
        <AdminTools />
      </div>

      {/* Chat with Claude */}
      <AdminChat />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ flex: '1 1 130px', minWidth: 130, padding: '10px 12px', border: '1px solid var(--line,#2a2a2a)', borderRadius: 12 }}>
      <div style={{ fontSize: 26, fontWeight: 600, color: accent ? 'var(--gold, #a9762a)' : 'inherit' }}>{value}</div>
      <div className="dim mono" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
    </div>
  );
}
