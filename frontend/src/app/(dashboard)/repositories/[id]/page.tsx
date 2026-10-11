import Link from 'next/link';

import { ScanNowButton } from '../../../../components/repositories/ScanNowButton';

import { ScanningProgress } from '../../../../components/repositories/ScanningProgress';
import { serverFetch } from '../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function RepositoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
  
  let repoData;
  try {
    repoData = await serverFetch(`${backendUrl}/api/analysis/repositories/${id}`, { cache: 'no-store' });
  } catch (err) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-semantic-danger)' }}>Failed to load repository details</p>
      </div>
    );
  }

  let couplingData: any = null;
  let hotspotData: any = null;
  try {
    couplingData = await serverFetch(`${backendUrl}/api/intelligence/coupling/${id}`, { cache: 'no-store' });
  } catch(e) {}
  try {
    hotspotData = await serverFetch(`${backendUrl}/api/intelligence/hotspots/${id}`, { cache: 'no-store' });
  } catch(e) {}

  const activeCouplingCount = couplingData?.components?.length || 0;
  const criticalHotspotsCount = hotspotData ? Object.values(hotspotData).filter((h: any) => h.risk === 'High' || h.risk === 'Critical').length : 0;

  const latestJob = repoData.analysisJobs?.[0];
  const isScanning = latestJob?.status === 'RUNNING' || latestJob?.status === 'QUEUED';
  const lastScanned = repoData.lastScannedAt ? new Date(repoData.lastScannedAt).toLocaleString() : 'Never';
  const fileMetrics = repoData.fileMetrics || [];
  
  // Calculate aggregate metrics
  const avgComplexity = fileMetrics.length > 0 
    ? (fileMetrics.reduce((acc: number, f: any) => acc + (f.complexity || 0), 0) / fileMetrics.length).toFixed(1)
    : 0;

  const currentProgress = latestJob?.progress || 0;
  const getStage = (p: number) => {
    if (p === 0) return 'Queued';
    if (p < 30) return 'Cloning Repository';
    if (p < 50) return 'Analyzing Commits';
    if (p < 85) return 'Running Intelligence Engines';
    if (p < 100) return 'Generating Reports';
    return 'Completed';
  };
  const currentStage = getStage(currentProgress);
  
  const repoMetrics = {
    id: repoData.id,
    name: repoData.name,
    owner: repoData.owner,
    url: repoData.url,
    health: Math.round(repoData.healthScore || 0),
    debtHours: Math.round(fileMetrics.reduce((acc: number, f: any) => acc + (f.complexity || 0) * 0.5, 0)), // naive calculation for now
    loc: 'Analyzed', // NLOC not stored in DB currently, we could add it later
    lastScanned,
    complexity: avgComplexity,
  };

  const getRiskLevel = (riskScore?: number) => {
    if (riskScore == null) return { risk: 'Unknown', color: 'var(--color-text-secondary)' };
    if (riskScore >= 0.8) return { risk: 'Critical', color: 'var(--color-semantic-danger)' };
    if (riskScore >= 0.6) return { risk: 'High', color: 'var(--color-semantic-warning)' };
    if (riskScore >= 0.3) return { risk: 'Medium', color: 'var(--color-semantic-warning)' };
    return { risk: 'Low', color: 'var(--color-semantic-success)' };
  };

  const mappedFileMetrics = fileMetrics.map((f: any) => {
    const riskLevel = getRiskLevel(f.riskScore);
    return {
      path: f.filePath,
      complexity: f.complexity || 0,
      churn: f.churnCount || 0,
      risk: riskLevel.risk,
      riskScorePercent: f.riskScore != null ? Math.round(f.riskScore * 100) + '%' : 'N/A',
      confidencePercent: f.confidenceScore != null ? Math.round(f.confidenceScore * 100) + '%' : 'N/A',
      color: riskLevel.color,
      explanations: f.explanations || []
    };
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <div style={{ marginBottom: '24px', fontSize: '14px' }}>
        <Link href="/repositories" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>Repositories</Link>
        <span style={{ margin: '0 8px', color: 'var(--color-text-tertiary)' }}>/</span>
        <span style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>{repoMetrics.name}</span>
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--color-text-primary)' }}>{repoMetrics.name}</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            {repoMetrics.owner}/{repoMetrics.name} • Analyzed {repoMetrics.lastScanned}
          </p>
        </div>
        <ScanNowButton repoUrl={repoMetrics.url} owner={repoMetrics.owner} repo={repoMetrics.name} />
      </header>

      <ScanningProgress initialProgress={currentProgress} stage={currentStage} isActive={isScanning} />

      {/* Top Level KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Engineering Intelligence Score</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-semantic-success)' }}>{repoMetrics.health}/100</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Active Coupling Risks</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{activeCouplingCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Critical Hotspots</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-semantic-warning)' }}>{criticalHotspotsCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Lines of Code</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{repoMetrics.loc}</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--color-border-base)', marginBottom: '24px' }}>
        <Link href={`/repositories/${repoMetrics.id}`} style={{ padding: '12px 0', borderBottom: '2px solid var(--color-semantic-info)', color: 'var(--color-text-primary)', fontWeight: '600', textDecoration: 'none' }}>Overview</Link>
        <Link href="/knowledge-risk" style={{ padding: '12px 0', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Knowledge Risk</Link>
        <Link href="/architectural-hotspots" style={{ padding: '12px 0', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Hotspots</Link>
        <Link href="/temporal-coupling" style={{ padding: '12px 0', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Coupling</Link>
        <Link href="/repository-evolution" style={{ padding: '12px 0', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Evolution</Link>
        <Link href="/ai-review-assistant" style={{ padding: '12px 0', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>AI Reviews</Link>
      </div>

      {/* Deep Dive Grid (Overview Tab Content) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: File Granularity */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: 'var(--color-text-primary)' }}>High Risk Files</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-base)' }}>
                <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>File Path</th>
                <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Cyclomatic Complexity</th>
                <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Churn (30d)</th>
                <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>ML Risk</th>
                <th style={{ paddingBottom: '12px', fontWeight: '500', color: 'var(--color-text-secondary)', fontSize: '12px', textTransform: 'uppercase' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {mappedFileMetrics.map((file: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border-base)' }}>
                  <td style={{ padding: '16px 0', fontFamily: 'monospace', fontSize: '14px', color: 'var(--color-text-primary)' }}>{file.path}</td>
                  <td style={{ padding: '16px 0', color: 'var(--color-text-secondary)' }}>{file.complexity}</td>
                  <td style={{ padding: '16px 0', color: 'var(--color-text-secondary)' }}>{file.churn}</td>
                  <td style={{ padding: '16px 0' }}>
                    <div style={{ color: file.color, fontWeight: '500', fontSize: '14px' }}>{file.risk} ({file.riskScorePercent})</div>
                  </td>
                  <td style={{ padding: '16px 0', color: 'var(--color-text-secondary)' }}>{file.confidencePercent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Column: AI Insights */}
        <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(to bottom, var(--color-bg-elevated), rgba(0, 112, 243, 0.05))' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✨</span> AI Insights
          </h2>
          
          {mappedFileMetrics.filter((f: any) => f.explanations && f.explanations.length > 0).slice(0, 5).map((file: any, i: number) => (
            <div key={i} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--color-border-base)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: file.color, marginBottom: '8px' }}>Risk Assessment: {file.path}</h3>
              {file.explanations.map((exp: string, j: number) => (
                <p key={j} style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '8px' }}>
                  {exp}
                </p>
              ))}
            </div>
          ))}

          {mappedFileMetrics.filter((f: any) => f.explanations && f.explanations.length > 0).length === 0 && (
             <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>No critical insights at this time.</p>
          )}
        </div>

      </div>
    </div>
  );
}
