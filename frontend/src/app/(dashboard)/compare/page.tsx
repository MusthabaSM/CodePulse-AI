"use client";

import React, { useState, useEffect } from 'react';
import styles from './Compare.module.css';
import { useApiClient } from '../../../lib/api/client';

export default function ComparePage() {
  const { fetchApi } = useApiClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // In production: fetchApi('/api/analysis/compare?snapshotIdA=xxx&snapshotIdB=yyy')
    setTimeout(() => {
      setData({
        snapshotA: {
          versionLabel: 'v1.0 (Legacy)',
          healthScore: 55,
          totalDebtHours: 1200,
          maintenanceCost: 90000,
          riskScore: 28,
        },
        snapshotB: {
          versionLabel: 'v2.0 (Post-Refactor)',
          healthScore: 82,
          totalDebtHours: 450,
          maintenanceCost: 33750,
          riskScore: 12,
        },
        deltas: {
          healthScoreDifference: 27,
          technicalDebtDifference: -750,
          costReduction: 56250,
          riskReduction: 16
        },
        executiveSummary: "The recent refactoring initiative successfully improved the overall Health Score by 27 points. By reducing technical debt by 750 hours in core payment modules, the engineering team has decreased the release risk by 16% and will save an estimated $56,250 in annual maintenance overhead."
      });
      setLoading(false);
    }, 800);
  }, []);

  if (loading || !data) return <div className={styles.container}>Loading comparison data...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Repository Benchmarking</h1>
        <p className={styles.subtitle}>Compare snapshots to measure the ROI of your engineering efforts.</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.selectGroup}>
          <label>Baseline (Snapshot A)</label>
          <select className={styles.select}>
            <option>v1.0 (Legacy Core) - May 1st</option>
          </select>
        </div>
        <div className={styles.vsBadge}>VS</div>
        <div className={styles.selectGroup}>
          <label>Target (Snapshot B)</label>
          <select className={styles.select}>
            <option>v2.0 (Post-Refactor) - Jun 5th</option>
          </select>
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryTitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          AI Executive Summary
        </div>
        <div className={styles.summaryText}>
          {data.executiveSummary}
        </div>
      </div>

      <div className={styles.splitView}>
        {/* SNAPSHOT A */}
        <div className={styles.side}>
          <div className={styles.sideTitle}>{data.snapshotA.versionLabel}</div>
          
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Health Score</span>
            <span className={styles.metricValue}>{data.snapshotA.healthScore}/100</span>
          </div>
          
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Technical Debt</span>
            <span className={styles.metricValue}>{data.snapshotA.totalDebtHours} hrs</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Maint. Cost (Est)</span>
            <span className={styles.metricValue}>${data.snapshotA.maintenanceCost.toLocaleString()}</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Bug Risk</span>
            <span className={styles.metricValue}>{data.snapshotA.riskScore}%</span>
          </div>
        </div>

        {/* SNAPSHOT B */}
        <div className={styles.side}>
          <div className={styles.sideTitle}>{data.snapshotB.versionLabel}</div>
          
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Health Score</span>
            <span className={styles.metricValue} style={{color: 'var(--color-semantic-success)'}}>{data.snapshotB.healthScore}/100</span>
          </div>
          
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Technical Debt</span>
            <span className={styles.metricValue}>{data.snapshotB.totalDebtHours} hrs</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Maint. Cost (Est)</span>
            <span className={styles.metricValue}>${data.snapshotB.maintenanceCost.toLocaleString()}</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Bug Risk</span>
            <span className={styles.metricValue}>{data.snapshotB.riskScore}%</span>
          </div>
        </div>

        {/* DELTAS */}
        <div className={styles.deltaContainer}>
          <div className={`${styles.deltaPill} ${data.deltas.healthScoreDifference >= 0 ? styles.deltaGood : styles.deltaBad}`}>
            {data.deltas.healthScoreDifference >= 0 ? '↗' : '↘'} {Math.abs(data.deltas.healthScoreDifference)} pt Health
          </div>
          
          <div className={`${styles.deltaPill} ${data.deltas.technicalDebtDifference <= 0 ? styles.deltaGood : styles.deltaBad}`}>
            {data.deltas.technicalDebtDifference <= 0 ? '↘' : '↗'} {Math.abs(data.deltas.technicalDebtDifference)} hrs Debt
          </div>

          <div className={`${styles.deltaPill} ${data.deltas.costReduction >= 0 ? styles.deltaGood : styles.deltaBad}`}>
            {data.deltas.costReduction >= 0 ? '↘' : '↗'} ${Math.abs(data.deltas.costReduction).toLocaleString()} Cost
          </div>
        </div>

      </div>
    </div>
  );
}
