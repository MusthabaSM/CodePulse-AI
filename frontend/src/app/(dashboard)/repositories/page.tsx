import Link from 'next/link';
import { AddRepositoryAction } from '../../../components/repositories/AddRepositoryAction';
import { AutoRefresher } from '../../../components/repositories/AutoRefresher';
import { serverFetch } from '../../../lib/api/server';
export const dynamic = 'force-dynamic';

export default async function RepositoriesPage() {
  let repos: any = [];
  try {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
    repos = await serverFetch(`${backendUrl}/api/analysis/repositories`, { cache: 'no-store' });
  } catch (err) {
    console.error('Failed to fetch repositories:', err);
  }

  // Map real repos to the expected shape, with fallbacks for missing analysis
  const mappedRepos = repos.map((repo: any) => {
    const latestJob = repo.analysisJobs?.[0];
    const latestSnapshot = repo.snapshots?.[0];
    const isScanning = latestJob?.status === 'RUNNING' || latestJob?.status === 'QUEUED';
    const status = isScanning ? `Scanning (${latestJob?.progress || 0}%)` : (repo.healthScore > 80 ? 'Healthy' : repo.healthScore > 70 ? 'At Risk' : 'Critical');
    
    return {
      id: repo.id,
      name: repo.name,
      owner: repo.owner,
      health: Math.round(repo.healthScore || 0),
      debtHours: latestSnapshot ? latestSnapshot.totalDebtHours : 0,
      lastScanned: repo.lastScannedAt ? new Date(repo.lastScannedAt).toLocaleString() : 'Never',
      status: status,
      isScanning: isScanning
    };
  });

  const anyScanning = mappedRepos.some((r: any) => r.isScanning);

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <AutoRefresher isActive={anyScanning} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Repositories</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Manage and analyze your connected codebases.
          </p>
        </div>
        <AddRepositoryAction />
      </header>

      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-base)', background: 'var(--color-bg-base)' }}>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Health Score</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tech Debt</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Scanned</th>
              <th style={{ padding: '16px 24px' }}></th>
            </tr>
          </thead>
          <tbody>
            {mappedRepos.map((repo: any, i: number) => (
              <tr key={repo.id} style={{ borderBottom: i === mappedRepos.length - 1 ? 'none' : '1px solid var(--color-border-base)' }}>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ fontWeight: '500', color: 'var(--color-text-primary)' }}>{repo.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>{repo.owner}/{repo.name}</div>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: '600', color: repo.health > 80 ? 'var(--color-semantic-success)' : repo.health > 70 ? 'var(--color-semantic-warning)' : 'var(--color-semantic-danger)' }}>
                      {repo.health}/100
                    </span>
                    <div style={{ width: '60px', height: '6px', background: 'var(--color-bg-base)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${repo.health}%`, 
                        background: repo.health > 80 ? 'var(--color-semantic-success)' : repo.health > 70 ? 'var(--color-semantic-warning)' : 'var(--color-semantic-danger)' 
                      }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px 24px', color: 'var(--color-text-secondary)' }}>
                  {repo.debtHours} hrs
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: repo.status === 'Healthy' ? 'rgba(16, 185, 129, 0.1)' : repo.status === 'At Risk' ? 'rgba(239, 68, 68, 0.1)' : repo.isScanning ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: repo.status === 'Healthy' ? 'var(--color-semantic-success)' : repo.status === 'At Risk' ? 'var(--color-semantic-danger)' : repo.isScanning ? 'var(--color-semantic-info)' : 'var(--color-semantic-warning)'
                  }}>
                    {repo.status}
                  </span>
                </td>
                <td style={{ padding: '20px 24px', color: 'var(--color-text-tertiary)', fontSize: '14px' }}>
                  {repo.lastScanned}
                </td>
                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                  <Link 
                    href={`/repositories/${repo.id}`}
                    style={{
                      color: 'var(--color-accent-primary)',
                      fontSize: '14px',
                      fontWeight: '500',
                      textDecoration: 'none'
                    }}
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
