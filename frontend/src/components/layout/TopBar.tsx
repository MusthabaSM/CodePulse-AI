"use client";

import { useState, useEffect } from 'react';
import styles from './TopBar.module.css';
import { useAppAuth, LoginButton, UserProfileButton } from '../../lib/auth/AuthService';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

import { useApiClient } from '../../lib/api/client';
import { useRepository } from '../../contexts/RepositoryContext';

export function TopBar() {
  const { isAuthenticated, user, organization } = useAppAuth();
  const { fetchApi } = useApiClient();
  const [orgName, setOrgName] = useState<string>('Loading...');
  
  const { repositories, selectedRepositoryId, setSelectedRepositoryId, loading: reposLoading } = useRepository();

  useEffect(() => {
    const fetchOrg = () => {
      fetchApi('/api/settings/organization')
        .then((data: any) => {
          if (data && data.name !== undefined) {
            setOrgName(data.name);
          } else {
            setOrgName('');
          }
        })
        .catch(() => setOrgName(''));
    };

    if (isAuthenticated) {
      fetchOrg();
    }

    window.addEventListener('organization-updated', fetchOrg);
    return () => window.removeEventListener('organization-updated', fetchOrg);
  }, [isAuthenticated, fetchApi]);

  return (
    <header className={styles.topbar}>
      <div className={styles.searchContainer}>
        <input 
          type="text" 
          placeholder="Search repositories, files... (Cmd+K)" 
          className={styles.searchInput}
        />
      </div>
      
      <div className={styles.rightSection} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAuthenticated && (
          <div className={styles.orgSelector}>
            {reposLoading ? (
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Loading repositories...</span>
            ) : (
              <select 
                value={selectedRepositoryId || ''} 
                onChange={(e) => setSelectedRepositoryId(e.target.value || null)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border-base)',
                  background: 'var(--color-bg-base)',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {!selectedRepositoryId && <option value="" disabled>Select Repository</option>}
                {repositories.length === 0 && <option value="" disabled>No repositories</option>}
                {repositories.map(repo => (
                  <option key={repo.id} value={repo.id}>
                    {repo.owner}/{repo.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        
        <div className={styles.orgSelector} style={{ borderLeft: '1px solid var(--color-border-base)', paddingLeft: '16px' }}>
          {isAuthenticated ? orgName : 'Guest Workspace'}
        </div>
        <div style={{ marginLeft: '12px', marginRight: '12px' }}>
          <ThemeSwitcher />
        </div>
        <div>
          {isAuthenticated ? <UserProfileButton /> : <LoginButton />}
        </div>
      </div>
    </header>
  );
}
