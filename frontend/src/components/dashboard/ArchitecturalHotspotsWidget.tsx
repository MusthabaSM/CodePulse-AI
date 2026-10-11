'use client';

import React, { useEffect, useState } from 'react';
import { useApiClient } from '../../lib/api/client';
import { useRepository } from '../../contexts/RepositoryContext';

interface Hotspot {
  repository: string;
  component: string;
  hotspot_score: number;
  risk: string;
  complexity_score: number;
  change_score: number;
  ownership_score: number;
  coupling_score: number;
  reasons: string[];
  metrics?: {
    ccn: number;
    nloc: number;
    churn_180d: number;
    burst_ratio: number;
    contributor_count: number;
    entropy: number;
    max_coupling: number;
  };
}

export function ArchitecturalHotspotsWidget() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();
  const { selectedRepositoryId } = useRepository();

  useEffect(() => {
    if (!selectedRepositoryId) {
      setHotspots([]);
      setLoading(false);
      return;
    }

    const fetchHotspots = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi(`/api/intelligence/hotspots/${selectedRepositoryId}`);
        const allHotspots: Hotspot[] = [];
        if (response && typeof response === 'object') {
            Object.values(response).forEach((comp: any) => {
                if (comp && typeof comp === 'object' && comp.hotspot_score !== undefined) {
                    allHotspots.push(comp);
                }
            });
            allHotspots.sort((a, b) => (b.hotspot_score || 0) - (a.hotspot_score || 0));
            setHotspots(allHotspots.slice(0, 10));
        } else {
            setHotspots([]);
        }
      } catch (err: any) {
        console.error('Failed to load hotspots', err);
        setError('Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    };
    fetchHotspots();
  }, [fetchApi, selectedRepositoryId]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'var(--color-semantic-danger)';
      case 'High': return 'var(--color-semantic-warning)';
      case 'Medium': return 'var(--color-semantic-warning)';
      default: return 'var(--color-semantic-success)';
    }
  };

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px' }}>Architectural Hotspots</h2>
        <div style={{ opacity: 0.5 }}>Loading hotspot data...</div>
      </div>
    );
  }

  if (!selectedRepositoryId) {
    return null;
  }

  return (
    <div className="glass-panel" style={{ padding: 'var(--spacing-6)' }}>
      <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
        Architectural Hotspots
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error ? (
          <div style={{ textAlign: 'center', opacity: 0.8, padding: '32px', color: 'var(--color-semantic-danger)' }}>{error}</div>
        ) : hotspots.length > 0 ? (
          hotspots.map((hotspot, idx) => (
            <div key={`${hotspot.repository}-${hotspot.component}-${idx}`} style={{ background: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{hotspot.repository} / {hotspot.component}</h3>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <span>Complexity: {hotspot.metrics?.ccn || 0}</span>
                    <span>Churn: {hotspot.metrics?.churn_180d || 0}</span>
                    <span>Ownership: {hotspot.metrics?.contributor_count || 0}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{hotspot.hotspot_score}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: getRiskColor(hotspot.risk), border: `1px solid ${getRiskColor(hotspot.risk)}` }}>
                    {hotspot.risk}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {hotspot.reasons.map((reason, rIdx) => (
                  <div key={rIdx} style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
                    • {reason}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.5, padding: '32px' }}>Repository not analyzed yet or no hotspots detected.</div>
        )}
      </div>
    </div>
  );
}
