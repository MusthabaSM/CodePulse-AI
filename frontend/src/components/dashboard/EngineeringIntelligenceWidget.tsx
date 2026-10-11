'use client';

import React, { useEffect, useState } from 'react';
import { useApiClient } from '../../lib/api/client';
import { useRepository } from '../../contexts/RepositoryContext';

export function EngineeringIntelligenceWidget() {
  const [score, setScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();
  const { selectedRepositoryId } = useRepository();

  useEffect(() => {
    if (!selectedRepositoryId) {
      setScore(null);
      setLoading(false);
      return;
    }

    const fetchScore = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi(`/api/intelligence/score/${selectedRepositoryId}`);
        if (response) {
            // response is a map of components to scores
            const components = Object.values(response) as any[];
            let totalScore = 0;
            let critical = 0;
            let high = 0;
            let medium = 0;
            let low = 0;
            let criticalComps: string[] = [];

            components.forEach(comp => {
              // The backend returns a Risk/Debt score (0 = perfect, 100 = terrible)
              // We invert it here so 100 is a perfect "Intelligence" score.
              const riskScore = comp.engineering_intelligence_score || 0;
              const healthScore = Math.max(0, 100 - riskScore);
              totalScore += healthScore;
              
              const risk = comp.risk_level || 'Healthy';
              if (risk === 'Critical') { critical++; criticalComps.push(comp.component); }
              else if (risk === 'High') high++;
              else if (risk === 'Medium' || risk === 'Watch') medium++;
              else low++;
            });

            const avgScore = components.length > 0 ? Math.round(totalScore / components.length) : 0;
            
            setScore({
              overall_score: avgScore,
              summary: `Analyzed ${components.length} components. Average intelligence score is ${avgScore}/100.`,
              risk_distribution: { critical, high, medium, low },
              critical_components: criticalComps
            });
        }
      } catch (err: any) {
        console.error('Failed to load score', err);
        setError('Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, [fetchApi, selectedRepositoryId]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px' }}>Engineering Intelligence</h2>
        <div style={{ opacity: 0.5 }}>Loading intelligence data...</div>
      </div>
    );
  }

  if (!selectedRepositoryId) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
        Engineering Intelligence
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error ? (
          <div style={{ textAlign: 'center', opacity: 0.8, padding: '32px', color: 'var(--color-semantic-danger)' }}>{error}</div>
        ) : score ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             
             {/* Main Score & Summary */}
             <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
               <div style={{ textAlign: 'center', padding: '16px', borderRight: '1px solid var(--color-border-base)' }}>
                 <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Overall Score</div>
                 <div style={{ fontSize: '32px', fontWeight: 'bold', color: score.overall_score >= 80 ? 'var(--color-semantic-success)' : score.overall_score >= 50 ? 'var(--color-semantic-warning)' : 'var(--color-semantic-danger)' }}>
                   {score.overall_score || 0}/100
                 </div>
               </div>
               <div style={{ flex: 1, paddingLeft: '8px' }}>
                 <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>Intelligence Summary</div>
                 <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                   {score.summary || 'No summary available for this repository.'}
                 </div>
               </div>
             </div>

             {/* Risk Distribution & Critical Components */}
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div style={{ background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
                 <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Risk Distribution</div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                     <span style={{ color: 'var(--color-semantic-danger)' }}>Critical Risk</span>
                     <span>{score.risk_distribution?.critical || 0}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                     <span style={{ color: 'var(--color-semantic-warning)' }}>High Risk</span>
                     <span>{score.risk_distribution?.high || 0}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                     <span style={{ color: 'var(--color-semantic-info)' }}>Medium Risk</span>
                     <span>{score.risk_distribution?.medium || 0}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                     <span style={{ color: 'var(--color-semantic-success)' }}>Low Risk</span>
                     <span>{score.risk_distribution?.low || 0}</span>
                   </div>
                 </div>
               </div>

               <div style={{ background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
                 <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Critical Components</div>
                 {score.critical_components && score.critical_components.length > 0 ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     {score.critical_components.slice(0, 4).map((comp: string, i: number) => (
                       <div key={i} style={{ fontSize: '12px', background: 'var(--color-bg-elevated)', padding: '6px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                         {comp}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>No critical components identified.</div>
                 )}
               </div>
             </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>Repository not analyzed yet.</div>
        )}
      </div>
    </div>
  );
}
