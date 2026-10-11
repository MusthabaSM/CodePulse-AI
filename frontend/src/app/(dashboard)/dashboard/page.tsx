import styles from './Dashboard.module.css';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';
import { PdfExportButton } from '../../../components/ui/PdfExportButton';
import { serverFetch } from '../../../lib/api/server';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function ExecutiveDashboard() {
  let report: any = null;
  let loading = true;

  try {
    const backendUrl = process.env.INTERNAL_BACKEND_URL || 'http://localhost:4000';
    report = await serverFetch(`${backendUrl}/api/analysis/report/latest`, { cache: 'no-store' });
  } catch (err) {
    console.error('Failed to fetch executive report:', err);
  } finally {
    loading = false;
  }

  return (
    <div id="dashboard-report" className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Engineering Intelligence Dashboard</h1>
          <p className={styles.subtitle}>
            Codebase Intelligence &bull; {report?.metadata?.generatedAt ? `Latest Snapshot: ${new Date(report.metadata.generatedAt).toLocaleDateString()}` : 'No analysis snapshot available'}
          </p>
        </div>
        <PdfExportButton targetId="dashboard-report" filename={`CodePulse_Dashboard.pdf`} className={styles.actionButton} buttonText="Export PDF Report" />
      </div>

      {loading && <DashboardSkeleton />}

      {!loading && <DashboardClient />}

    </div>
  );
}
