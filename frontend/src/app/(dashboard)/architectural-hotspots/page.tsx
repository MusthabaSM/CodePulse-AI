import styles from '../dashboard/Dashboard.module.css';
import { ArchitecturalHotspotsWidget } from '../../../components/dashboard/ArchitecturalHotspotsWidget';

export const dynamic = 'force-dynamic';

export default function ArchitecturalHotspotsPage() {
  return (
    <div className={styles.dashboardContainer} style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Architectural Hotspots</h1>
          <p className={styles.subtitle}>
            Identify parts of the codebase with high complexity and frequent changes.
          </p>
        </div>
      </div>
      <ArchitecturalHotspotsWidget />
    </div>
  );
}
