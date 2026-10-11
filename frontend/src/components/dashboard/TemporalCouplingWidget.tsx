'use client';

import React, { useEffect, useState } from 'react';
import { useApiClient } from '../../lib/api/client';
import { useRepository } from '../../contexts/RepositoryContext';

export function TemporalCouplingWidget() {
  const [couplings, setCouplings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();
  const { selectedRepositoryId } = useRepository();

  useEffect(() => {
    if (!selectedRepositoryId) {
      setCouplings([]);
      setLoading(false);
      return;
    }

    const fetchCouplings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi(`/api/intelligence/coupling/${selectedRepositoryId}`);
        const items = Array.isArray(response) ? response : (response?.components && Array.isArray(response.components) ? response.components : []);
        setCouplings(items.slice(0, 10));
      } catch (err: any) {
        console.error('Failed to load coupling', err);
        setError('Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    };
    fetchCouplings();
  }, [fetchApi, selectedRepositoryId]);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px' }}>Temporal Coupling</h2>
        <div style={{ opacity: 0.5 }}>Loading coupling data...</div>
      </div>
    );
  }

  if (!selectedRepositoryId) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
        Temporal Coupling
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error ? (
          <div style={{ textAlign: 'center', opacity: 0.8, padding: '32px', color: 'var(--color-text-secondary)' }}>Analysis not completed yet</div>
        ) : couplings.length > 0 ? (
          couplings.map((coupling, idx) => (
            <div key={idx} style={{ background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{coupling.file_a} ↔ {coupling.file_b}</h3>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>Matches: {coupling.matches}</span>
                <span>Degree: {coupling.degree}%</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>Analysis completed, but no temporal coupling exceeded the threshold.</div>
        )}
      </div>
    </div>
  );
}
