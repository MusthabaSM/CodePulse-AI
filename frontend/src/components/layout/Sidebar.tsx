"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoContainer}>
        <div className={styles.logoIcon}></div>
        <div className={styles.logoText}>CodePulse AI</div>
        <button className={styles.collapseBtn} onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      
      <nav className={styles.navScrollArea}>
        <div className={styles.navGroup}>
          <div className={styles.navGroupTitle}>Overview</div>
          <ul className={styles.navList}>
            <li><Link href="/dashboard" className={`${styles.navItem} ${isActive('/dashboard') ? styles.active : ''}`}><span className={styles.navItemText}>Dashboard</span></Link></li>
            <li><Link href="/repositories" className={`${styles.navItem} ${isActive('/repositories') ? styles.active : ''}`}><span className={styles.navItemText}>Repositories</span></Link></li>
          </ul>
        </div>

        <div className={styles.navGroup}>
          <div className={styles.navGroupTitle}>Intelligence</div>
          <ul className={styles.navList}>
            <li><Link href="/engineering-intelligence" className={`${styles.navItem} ${isActive('/engineering-intelligence') ? styles.active : ''}`}><span className={styles.navItemText}>Engineering Intelligence</span></Link></li>
            <li><Link href="/knowledge-risk" className={`${styles.navItem} ${isActive('/knowledge-risk') ? styles.active : ''}`}><span className={styles.navItemText}>Knowledge Risk</span></Link></li>
            <li><Link href="/architectural-hotspots" className={`${styles.navItem} ${isActive('/architectural-hotspots') ? styles.active : ''}`}><span className={styles.navItemText}>Architectural Hotspots</span></Link></li>
            <li><Link href="/temporal-coupling" className={`${styles.navItem} ${isActive('/temporal-coupling') ? styles.active : ''}`}><span className={styles.navItemText}>Temporal Coupling</span></Link></li>
            <li><Link href="/repository-evolution" className={`${styles.navItem} ${isActive('/repository-evolution') ? styles.active : ''}`}><span className={styles.navItemText}>Repository Evolution</span></Link></li>
            <li><Link href="/ai-review-assistant" className={`${styles.navItem} ${isActive('/ai-review-assistant') ? styles.active : ''}`}><span className={styles.navItemText}>AI Review Assistant</span></Link></li>
          </ul>
        </div>

        <div className={styles.navGroup}>
          <div className={styles.navGroupTitle}>Reporting</div>
          <ul className={styles.navList}>
            <li><Link href="/reports" className={`${styles.navItem} ${isActive('/reports') ? styles.active : ''}`}><span className={styles.navItemText}>Executive Reports</span></Link></li>
            <li><Link href="/compare" className={`${styles.navItem} ${isActive('/compare') ? styles.active : ''}`}><span className={styles.navItemText}>Compare Snapshots</span></Link></li>
          </ul>
        </div>

        <div className={styles.navGroup}>
          <div className={styles.navGroupTitle}>System</div>
          <ul className={styles.navList}>
            <li><Link href="/settings" className={`${styles.navItem} ${isActive('/settings') ? styles.active : ''}`}><span className={styles.navItemText}>Settings</span></Link></li>
          </ul>
        </div>
      </nav>

      <div className={styles.demoToggleContainer}>
        <DemoToggle isCollapsed={isCollapsed} />
      </div>
    </aside>
  );
}

import { useDemoMode } from '../../contexts/DemoContext';

function DemoToggle({ isCollapsed }: { isCollapsed?: boolean }) {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  if (isCollapsed) return null;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--color-bg-elevated)', borderRadius: '8px', border: '1px solid var(--color-border-base)' }}>
      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>Demo Mode</span>
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input type="checkbox" checked={isDemoMode} onChange={toggleDemoMode} style={{ marginRight: '8px' }} />
        <span style={{ fontSize: '12px', color: isDemoMode ? 'var(--color-semantic-success)' : 'var(--color-text-tertiary)' }}>
          {isDemoMode ? 'ON' : 'OFF'}
        </span>
      </label>
    </div>
  );
}
