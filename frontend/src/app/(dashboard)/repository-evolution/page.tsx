import styles from '../dashboard/Dashboard.module.css';
import { RepositoryEvolutionWidget } from '../../../components/dashboard/RepositoryEvolutionWidget';

export const dynamic = 'force-dynamic';

export default function RepositoryEvolutionPage() {
  return (
    <div className={styles.dashboardContainer} style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Repository Evolution</h1>
          <p className={styles.subtitle}>
            Track the structural changes and health of the repository over time.
          </p>
        </div>
      </div>
      <RepositoryEvolutionWidget />
    </div>
  );
}
