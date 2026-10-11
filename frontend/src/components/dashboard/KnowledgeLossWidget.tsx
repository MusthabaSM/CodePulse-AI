'use client';

import React, { useEffect, useState } from 'react';
import { useApiClient } from '../../lib/api/client';
import { useRepository } from '../../contexts/RepositoryContext';

export function KnowledgeLossWidget() {
  const [risk, setRisk] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();
  const { selectedRepositoryId } = useRepository();

  useEffect(() => {
    if (!selectedRepositoryId) {
      setRisk(null);
      setLoading(false);
      return;
    }

    const fetchRisk = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi(`/api/intelligence/knowledge-risk/${selectedRepositoryId}`);
        setRisk(response);
      } catch (err: any) {
        console.error('Failed to load risk', err);
        setError('Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, [fetchApi, selectedRepositoryId]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px' }}>Knowledge Risk</h2>
        <div style={{ opacity: 0.5 }}>Loading risk data...</div>
      </div>
    );
  }

  if (!selectedRepositoryId) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
        Knowledge Risk
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error ? (
          <div style={{ textAlign: 'center', opacity: 0.8, padding: '32px', color: 'var(--color-semantic-danger)' }}>{error}</div>
        ) : risk ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             {risk.components && Object.keys(risk.components).length > 0 ? (
               Object.keys(risk.components)
                 .map(key => ({ name: key, ...risk.components[key] }))
                 .sort((a, b) => (a.bus_factor || 0) - (b.bus_factor || 0))
                 .slice(0, 5)
                 .map((c, idx) => (
                   <div key={idx} style={{ background: 'var(--color-bg-base)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <div style={{ fontWeight: '600', fontSize: '14px' }}>{c.name}</div>
                       <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Owner: {c.top_author || c.primary_owner || 'Unknown'}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       <div style={{ fontWeight: 'bold', color: c.bus_factor <= 1 ? 'var(--color-semantic-danger)' : 'var(--color-semantic-warning)', fontSize: '14px' }}>BF: {c.bus_factor}</div>
                       <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{c.total_commits || c.authors_count} Commits</div>
                     </div>
                   </div>
                 ))
             ) : (
               <div style={{ textAlign: 'center', opacity: 0.5, padding: '16px' }}>No risks identified.</div>
             )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>Repository not analyzed yet.</div>
        )}
      </div>
    </div>
  );
}
