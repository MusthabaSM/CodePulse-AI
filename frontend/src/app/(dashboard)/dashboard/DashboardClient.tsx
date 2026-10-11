'use client';

import React from 'react';
import styles from './Dashboard.module.css';
import { useRepository } from '../../../contexts/RepositoryContext';
import { ArchitecturalHotspotsWidget } from '../../../components/dashboard/ArchitecturalHotspotsWidget';
import { TemporalCouplingWidget } from '../../../components/dashboard/TemporalCouplingWidget';
import { RepositoryEvolutionWidget } from '../../../components/dashboard/RepositoryEvolutionWidget';
import { EngineeringIntelligenceWidget } from '../../../components/dashboard/EngineeringIntelligenceWidget';
import { KnowledgeLossWidget } from '../../../components/dashboard/KnowledgeLossWidget';

export function DashboardClient() {
  const { selectedRepositoryId, repositories, loading } = useRepository();

  if (loading) {
    return (
      <div className={styles.dashboardContainer} style={{ padding: '32px', textAlign: 'center', opacity: 0.5 }}>
        Loading repository context...
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className={styles.dashboardContainer} style={{ padding: '32px', textAlign: 'center' }}>
        <h2>No Repositories Available</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          Please add a repository from the Repositories page to view intelligence metrics.
        </p>
      </div>
    );
  }

  if (!selectedRepositoryId) {
    return (
      <div className={styles.dashboardContainer} style={{ padding: '32px', textAlign: 'center' }}>
        <h2>Select a Repository</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
          Please select a repository from the top navigation bar to view its dashboard.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ width: '100%' }}>
         <EngineeringIntelligenceWidget />
      </div>

      <div className={styles.bentoGrid} style={{ marginTop: '20px' }}>
         <ArchitecturalHotspotsWidget />
         <TemporalCouplingWidget />
      </div>

      <div className={styles.bentoGrid} style={{ marginTop: '20px' }}>
         <KnowledgeLossWidget />
         <RepositoryEvolutionWidget />
      </div>
    </>
  );
}
