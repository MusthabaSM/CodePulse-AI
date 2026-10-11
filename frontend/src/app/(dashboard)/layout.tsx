import { Sidebar } from '../../components/layout/Sidebar';
import { TopBar } from '../../components/layout/TopBar';
import styles from '../../components/layout/DashboardLayout.module.css';
import { RepositoryProvider } from '../../contexts/RepositoryContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RepositoryProvider>
      <div className={styles.layoutWrapper}>
        <Sidebar />
        <div className={styles.mainContent}>
          <TopBar />
          <main className={styles.pageContainer}>
            {children}
          </main>
        </div>
      </div>
    </RepositoryProvider>
  );
}
