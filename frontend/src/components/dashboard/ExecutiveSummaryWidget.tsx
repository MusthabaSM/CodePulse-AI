"use client";

import React, { useState, useEffect } from 'react';
import styles from './ExecutiveSummaryWidget.module.css';
import { useDemoMode } from '../../contexts/DemoContext';
import { DashboardSkeleton } from '../ui/Skeleton';
import toast from 'react-hot-toast';
import { useApiClient } from '../../lib/api/client';

export function ExecutiveSummaryWidget() {
  const { isDemoMode } = useDemoMode();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState(75);
  const [teamSize, setTeamSize] = useState(5);
  const { fetchApi } = useApiClient();

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          // Fallback demo data
          await new Promise(r => setTimeout(r, 1000));
          setData({
            repoId: 'acme-corp/core-api',
            metrics: {
              estimatedMaintenanceCost: 108750,
              totalDebtHours: 1450,
              productivityLossPercent: 18,
              releaseRiskPercent: 28,
              topRoiRefactoringTargets: [
                { filePath: 'src/auth/auth.service.ts', costToFix: 2000, annualSavings: 31250, executiveSummary: 'Critical complexity bottleneck in authentication.' },
                { filePath: 'src/payment/stripe.adapter.ts', costToFix: 1500, annualSavings: 18000, executiveSummary: 'High bug-risk due to tight coupling.' }
              ]
            }
          });
        } else {
          // Real backend fetch
          const json = await fetchApi(`http://localhost:4000/api/analysis/business-metrics/global?hourlyRate=${rate}&teamSize=${teamSize}`);
          setData(json);
        }
      } catch (err: any) {
        toast.error('Failed to load business metrics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [rate, teamSize, isDemoMode]);

  if (loading || !data) return <div className={`glass-panel ${styles.widgetContainer}`}><DashboardSkeleton /></div>;

  const metrics = data.metrics;
  const assumptions = data.assumptions || { disclaimer: "Estimated using $75/hour developer rate" };

  return (
    <div className={`glass-panel ${styles.widgetContainer}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>Business Impact & Financials</h2>
        
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label>Dev Hourly Rate ($)</label>
            <input 
              type="number" 
              className={styles.controlInput} 
              value={rate} 
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>
          <div className={styles.controlGroup}>
            <label>Team Size</label>
            <input 
              type="number" 
              className={styles.controlInput} 
              value={teamSize} 
              onChange={(e) => setTeamSize(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className={styles.financialGrid}>
        <div className={styles.financeCard}>
          <span className={styles.cardTitle}>Est. Maintenance Cost (Annual)</span>
          <span className={styles.cardValue}>${metrics.estimatedMaintenanceCost.toLocaleString()}</span>
        </div>
        <div className={styles.financeCard}>
          <span className={styles.cardTitle}>Technical Debt Overhead</span>
          <span className={styles.cardValue} style={{color: 'var(--color-semantic-warning)'}}>{metrics.totalDebtHours.toLocaleString()} hrs</span>
        </div>
        <div className={styles.financeCard}>
          <span className={styles.cardTitle}>Productivity Loss</span>
          <span className={styles.cardValue}>{metrics.productivityLossPercent}%</span>
        </div>
      </div>
      
      <div className={styles.disclaimer}>
        * {assumptions.disclaimer}. Not exact financial figures.
      </div>

      <div className={styles.opportunitiesSection}>
        <h3 className={styles.oppTitle}>Top ROI Refactoring Opportunities</h3>
        <div className={styles.oppList}>
          {metrics.topRoiRefactoringTargets.map((opp: any, i: number) => (
            <div key={i} className={styles.oppItem}>
              <div className={styles.oppHeader}>
                <span className={styles.oppFile}>{opp.filePath}</span>
                <span className={styles.oppSavings}>+${opp.annualSavings.toLocaleString()} / yr savings</span>
              </div>
              <div className={styles.oppSummary}>{opp.executiveSummary}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
