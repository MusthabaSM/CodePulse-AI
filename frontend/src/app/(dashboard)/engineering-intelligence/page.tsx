import styles from '../dashboard/Dashboard.module.css';
import { EngineeringIntelligenceWidget } from '../../../components/dashboard/EngineeringIntelligenceWidget';

export const dynamic = 'force-dynamic';

export default function EngineeringIntelligencePage() {
  return (
    <div className={styles.dashboardContainer} style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Engineering Intelligence</h1>
          <p className={styles.subtitle}>
            Overall aggregate metrics and risk models across the repository.
          </p>
        </div>
      </div>
      <EngineeringIntelligenceWidget />
    </div>
  );
}
