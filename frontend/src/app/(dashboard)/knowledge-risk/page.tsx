'use client';

import React, { useEffect, useState } from 'react';
import styles from '../dashboard/Dashboard.module.css';
import { useRepository } from '../../../contexts/RepositoryContext';
import { useApiClient } from '../../../lib/api/client';

export default function KnowledgeRiskPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();
  const { selectedRepositoryId } = useRepository();

  useEffect(() => {
    if (!selectedRepositoryId) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi(`/api/intelligence/knowledge-risk/${selectedRepositoryId}`);
        setData(response);
      } catch (err: any) {
        console.error('Failed to load knowledge risk data', err);
        setError('Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchApi, selectedRepositoryId]);

  if (!selectedRepositoryId) {
    return (
      <div className={styles.dashboardContainer}>
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <h2>Select a Repository</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Please select a repository from the top navigation bar.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.dashboardContainer} style={{ padding: '32px', textAlign: 'center', opacity: 0.5 }}>
        Loading knowledge risk data...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.dashboardContainer} style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-semantic-danger)' }}>{error || 'No knowledge risk data found.'}</p>
      </div>
    );
  }

  // Extract components into a list
  const componentsList = data.components ? Object.keys(data.components).map(key => ({
    name: key,
    ...data.components[key]
  })) : [];

  // Sort by bus factor risk (e.g. lowest bus factor first)
  const topRisks = componentsList.sort((a, b) => (a.bus_factor || 0) - (b.bus_factor || 0)).slice(0, 10).map(c => {
    const isCritical = c.bus_factor <= 1;
    const factorText = isCritical ? 'Critical Bus Factor' : 'Bus Factor Risk';
    return {
      name: c.name,
      factor: factorText,
      owner: c.primary_owner || 'Unknown',
      metric: c.authors_count === 1 ? '100% Ownership' : `${c.authors_count} Authors`,
      status: isCritical ? 'High Risk' : 'Medium Risk'
    };
  });

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Knowledge Risk</h1>
          <p className={styles.subtitle}>
            Identify knowledge silos, bus factor risks, and code ownership concentration
          </p>
        </div>
        <button className={styles.actionButton}>Export Report</button>
      </div>

      {/* 1. KPIs */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard}`}>
          <div className={styles.kpiTitle}>Global Bus Factor</div>
          <div className={styles.kpiValue}>{data.overall_bus_factor || 0}</div>
          <div className={styles.kpiTrend}>Key developers</div>
        </div>
        
        <div className={`${styles.kpiCard} ${styles.kpiWarning}`}>
          <div className={styles.kpiTitle}>High Risk Components</div>
          <div className={styles.kpiValue}>{data.components_at_risk || 0}</div>
          <div className={styles.kpiTrend}>Low bus factor count</div>
        </div>
        
        <div className={`${styles.kpiCard}`}>
          <div className={styles.kpiTitle}>Siloed Knowledge</div>
          <div className={styles.kpiValue}>{componentsList.filter(c => c.authors_count === 1).length}</div>
          <div className={styles.kpiTrend}>Single author components</div>
        </div>
        
        <div className={`${styles.kpiCard}`}>
          <div className={styles.kpiTitle}>Total Authors</div>
          <div className={styles.kpiValue}>{new Set(componentsList.map(c => c.primary_owner).filter(Boolean)).size || 'N/A'}</div>
          <div className={styles.kpiTrend}>Unique primary authors</div>
        </div>
      </div>

      {/* 2. Lists */}
      <div className={styles.bentoGrid}>
        <div className={styles.panel} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-semantic-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              Critical Ownership Risks
            </h3>
          </div>
          <div className={styles.insightList}>
            {topRisks.length > 0 ? topRisks.map((risk, i) => (
              <div key={i} className={styles.insightItem}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{risk.name}</span>
                  <span className={styles.itemDesc}>{risk.factor}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Primary Owner</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{risk.owner}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Metric</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--color-semantic-warning)' }}>{risk.metric}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '12px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                    <span style={{ fontWeight: 'bold', color: risk.status === 'High Risk' ? 'var(--color-semantic-danger)' : 'var(--color-semantic-warning)' }}>{risk.status}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>No significant ownership risks identified.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
