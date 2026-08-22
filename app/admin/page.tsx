import { requireAdminStepUp } from '@/lib/admin-stepup';
import { admin } from '@/lib/supabase/admin';
import AdminTools from './AdminTools';

export const dynamic = 'force-dynamic';

async function count(table: string): Promise<number> {
  const { count } = await admin().from(table).select('id', { count: 'exact', head: true });
  return count ?? 0;
}

export default async function AdminDashboard() {
  const account = await requireAdminStepUp();

  const [accounts, boxes, contents, openReports] = await Promise.all([
    count('account'),
    count('box'),
    count('content'),
    admin().from('report').select('id', { count: 'exact', head: true }).eq('status', 'open').then((r) => r.count ?? 0),
  ]);

  const stats: [string, number][] = [
    ['Accounts', accounts],
    ['Boxes', boxes],
    ['Content', contents],
    ['Open reports', openReports],
  ];

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="between">
        <div><p className="eyebrow">Platform</p><h1>Admin backend</h1></div>
        <div className="row">
          <a href="/moderation"><button className="ghost sm">Moderation console →</button></a>
          <a href="/app"><button className="ghost sm">Dashboard</button></a>
        </div>
      </div>
      <p className="dim mono" style={{ fontSize: 12 }}>{account.public_id} · fingerprint-verified session</p>

      <div className="row" style={{ flexWrap: 'wrap', gap: 10, margin: '12px 0' }}>
        {stats.map(([label, n]) => (
          <div className="card" key={label} style={{ flex: '1 1 130px', minWidth: 130 }}>
            <div style={{ fontSize: 28, fontWeight: 600 }}>{n}</div>
            <div className="dim mono" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
          </div>
        ))}
      </div>

      <AdminTools />
    </div>
  );
}
