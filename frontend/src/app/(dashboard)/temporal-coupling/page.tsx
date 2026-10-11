import styles from '../dashboard/Dashboard.module.css';
import { TemporalCouplingWidget } from '../../../components/dashboard/TemporalCouplingWidget';

export const dynamic = 'force-dynamic';

export default function TemporalCouplingPage() {
  return (
    <div className={styles.dashboardContainer} style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Temporal Coupling</h1>
          <p className={styles.subtitle}>
            Analyze hidden dependencies between files that frequently change together.
          </p>
        </div>
      </div>
      <TemporalCouplingWidget />
    </div>
  );
}
