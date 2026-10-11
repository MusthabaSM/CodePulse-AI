"use client";

import React, { useState, useEffect } from 'react';
import styles from './Reports.module.css';
import { ClientPdfGenerator } from '../../../lib/pdf/ClientPdfGenerator';
import { useDemoMode } from '../../../contexts/DemoContext';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';
import { useAppAuth, LoginButton } from '../../../lib/auth/AuthService';
import toast from 'react-hot-toast';
import { useApiClient } from '../../../lib/api/client';

export default function ReportsPage() {
  const { fetchApi } = useApiClient();
  const { isDemoMode } = useDemoMode();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        if (isDemoMode) {
          await new Promise(r => setTimeout(r, 800));
          setData({
            metadata: {
              generatedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              repoId: 'acme-corp/core-api',
              version: 'Current Master',
              audience: "Executive Leadership"
            },
            health: { score: 72, grade: 'B' },
            businessImpact: { annualMaintenanceCost: 108750, technicalDebtHours: 1450, productivityLoss: 18 },
            risk: { overallRisk: 18, category: 'Moderate' },
            priorities: [
              { filePath: 'src/auth/auth.service.ts', costToFix: 2000, annualSavings: 31250, executiveSummary: 'Critical complexity bottleneck in authentication.' },
              { filePath: 'src/payment/stripe.adapter.ts', costToFix: 1500, annualSavings: 18000, executiveSummary: 'High bug-risk due to tight coupling.' }
            ],
            executiveSummary: "The 'core-api' repository is currently carrying a significant amount of technical debt that poses a moderate risk to future release cycles. The estimated annual maintenance cost of this debt is $108,750, resulting in an 18% productivity loss across the engineering team."
          });
        } else {
          const json = await fetchApi(`http://localhost:4000/api/analysis/report/latest`);
          setData(json);
        }
      } catch (err) {
        toast.error('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [isDemoMode]);

  const handleExport = async () => {
    setExporting(true);
    toast.loading('Generating PDF...', { id: 'pdf-toast' });
    try {
      const generator = new ClientPdfGenerator();
      await generator.generate('executive-report', `CodePulse_Report_${data.metadata.repoId.replace(/\//g, '_')}.pdf`);
      toast.success('PDF Exported Successfully!', { id: 'pdf-toast' });
    } catch (err) {
      console.error("Failed to export PDF", err);
      toast.error("Failed to export PDF", { id: 'pdf-toast' });
    } finally {
      setExporting(false);
    }
  };

  const { isAuthenticated } = useAppAuth();

  if (!isAuthenticated && !isDemoMode) {
    return (
      <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px', background: 'var(--color-bg-elevated)', borderRadius: '12px', border: '1px solid var(--color-border-base)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-text-primary)' }}>Enterprise Feature</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
            Executive Reports and PDF Exports are available exclusively to CodePulse Pro and Enterprise customers. 
            Sign in to upgrade your workspace.
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  if (loading || !data) return <div className={styles.container}><DashboardSkeleton /></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
          <h1 className={styles.title}>Executive Reports</h1>
          <p style={{color: 'var(--color-text-secondary)'}}>Generate presentation-ready consulting assessments.</p>
        </div>
        <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          {exporting ? 'Generating PDF...' : 'Export to PDF'}
        </button>
      </div>

      <div style={{overflow: 'auto', background: 'var(--color-bg-base)', padding: '2rem', borderRadius: '8px'}}>
        
        {/* The Printable Report Canvas */}
        <div id="executive-report" className={styles.reportContainer}>
          
          <div className={styles.reportHeader}>
            <div className={styles.corpLogo}>CODEPULSE ADVISORY</div>
            <h1 className={styles.reportTitle}>Engineering Intelligence Assessment</h1>
            <div className={styles.reportMeta}>
              <span>Target: {data.metadata.repoId}</span>
              <span>Date: {data.metadata.generatedAt}</span>
              <span>Audience: {data.metadata.audience}</span>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Executive Summary</h2>
            <div className={styles.summaryText}>{data.executiveSummary}</div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Business Impact & Health</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metricBox}>
                <div className={styles.metricLabel}>Total Technical Debt</div>
                <div className={styles.metricValue}>{data.businessImpact.technicalDebtHours.toLocaleString()} Hours</div>
              </div>
              <div className={`${styles.metricBox} ${styles.highRisk}`}>
                <div className={styles.metricLabel}>Annual Maintenance Drag</div>
                <div className={styles.metricValue}>${data.businessImpact.annualMaintenanceCost.toLocaleString()}</div>
              </div>
              <div className={styles.metricBox}>
                <div className={styles.metricLabel}>Overall Health Score</div>
                <div className={styles.metricValue}>{data.health.score}/100 (Grade: {data.health.grade})</div>
              </div>
              <div className={`${styles.metricBox} ${data.risk.category === 'High' ? styles.highRisk : ''}`}>
                <div className={styles.metricLabel}>Release Risk Profile</div>
                <div className={styles.metricValue}>{data.risk.category} ({data.risk.overallRisk}%)</div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Strategic Refactoring Priorities</h2>
            <ul className={styles.roadmapList}>
              {data.priorities.map((p: any, idx: number) => (
                <li key={idx} className={styles.roadmapItem}>
                  <div className={styles.roadmapNumber}>{idx + 1}</div>
                  <div className={styles.roadmapContent}>
                    <strong>{p.filePath}</strong>
                    <span>{p.executiveSummary} Remediation cost: ${p.costToFix.toLocaleString()}. Projected annual ROI: ${p.annualSavings.toLocaleString()}.</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
