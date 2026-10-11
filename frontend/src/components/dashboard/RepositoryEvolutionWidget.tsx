'use client';

import React, { useEffect, useState } from 'react';
import { useApiClient } from '../../lib/api/client';
import { useRepository } from '../../contexts/RepositoryContext';

export function RepositoryEvolutionWidget() {
  const [evolution, setEvolution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();
  const { selectedRepositoryId } = useRepository();

  useEffect(() => {
    if (!selectedRepositoryId) {
      setEvolution(null);
      setLoading(false);
      return;
    }

    const fetchEvolution = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi(`/api/intelligence/evolution/${selectedRepositoryId}`);
        setEvolution(response);
      } catch (err: any) {
        console.error('Failed to load evolution', err);
        setError('Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    };
    fetchEvolution();
  }, [fetchApi, selectedRepositoryId]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px' }}>Repository Evolution</h2>
        <div style={{ opacity: 0.5 }}>Loading evolution data...</div>
      </div>
    );
  }

  if (!selectedRepositoryId) {
    return null;
  }

  const renderEvolution = () => {
    if (!evolution) return <div style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>Repository not analyzed yet.</div>;
    
    // Check if it's the old mock format or the new real array format
    let healthScore: any = 'N/A';
    let loc: any = 0;
    let complexity: any = 0;

    if (Array.isArray(evolution)) {
      if (evolution.length > 0) {
        const latest = evolution[evolution.length - 1];
        healthScore = latest.engineering_intelligence_score || 'N/A';
        loc = latest.architectural?.average_churn || 0; // Using churn as a proxy since loc isn't in this report
        complexity = latest.architectural?.average_complexity || 0;
      }
    } else {
      healthScore = evolution.health_score_trend?.[evolution.health_score_trend?.length - 1] || 'N/A';
      loc = evolution.loc_trend?.[evolution.loc_trend?.length - 1] || 0;
      complexity = evolution.complexity_trend?.[evolution.complexity_trend?.length - 1] || 0;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Health Trend */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>Repository Health Trend</div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Overall health progression over the last analysis period.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Current Score</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-semantic-success)' }}>
              {healthScore}
            </div>
          </div>
        </div>

        {/* Evolution Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          <div style={{ background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Codebase Size / Churn</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {loc}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>avg</span>
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>Complexity Trend</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {complexity}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>avg / file</span>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
        Repository Evolution
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error ? (
          <div style={{ textAlign: 'center', opacity: 0.8, padding: '32px', color: 'var(--color-semantic-danger)' }}>{error}</div>
        ) : (
          renderEvolution()
        )}
      </div>
    </div>
  );
}
