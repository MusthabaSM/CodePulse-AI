"use client";

import { useState, useEffect, Suspense } from 'react';
import styles from '../dashboard/Dashboard.module.css';
import { useApiClient } from '../../../lib/api/client';
import { useSearchParams, useRouter } from 'next/navigation';

function SettingsContent() {
  const { fetchApi } = useApiClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [orgData, setOrgData] = useState({ name: '', industry: 'fintech' });
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgStatus, setOrgStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [githubData, setGithubData] = useState({ connected: false, connectedAccount: '', repositoryCount: 0, lastSyncTime: null });
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const fetchOrganization = async () => {
    try {
      const data = await fetchApi('/api/settings/organization');
      setOrgData({ name: data.name || '', industry: data.industry || 'fintech' });
    } catch (e) {}
  };

  const fetchGithub = async () => {
    try {
      const data = await fetchApi('/api/settings/github');
      setGithubData(data);
    } catch (e) {}
  };

  const fetchApiKeys = async () => {
    try {
      const data = await fetchApi('/api/settings/keys');
      setApiKeys(data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchOrganization();
    fetchGithub();
    fetchApiKeys();
  }, []);

  useEffect(() => {
    const githubResult = searchParams.get('github');
    if (githubResult === 'success') {
      setGithubStatus({ type: 'success', message: 'GitHub connected successfully!' });
      // Remove query param
      router.replace('/settings');
    } else if (githubResult === 'error') {
      setGithubStatus({ type: 'error', message: 'Failed to connect GitHub. Please verify credentials.' });
      router.replace('/settings');
    }
  }, [searchParams, router]);

  const handleSaveOrganization = async () => {
    setOrgSaving(true);
    setOrgStatus(null);
    try {
      await fetchApi('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData)
      });
      setOrgStatus({ type: 'success', message: 'Organization saved successfully!' });
      window.dispatchEvent(new Event('organization-updated'));
    } catch (e) {
      setOrgStatus({ type: 'error', message: 'Failed to save organization or an error occurred.' });
    } finally {
      setOrgSaving(false);
      setTimeout(() => setOrgStatus(null), 3000);
    }
  };

  const handleConnectGithub = async () => {
    setGithubConnecting(true);
    setGithubStatus(null);
    try {
      const data = await fetchApi('/api/settings/github/oauth-url');
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setGithubStatus({ type: 'error', message: 'OAuth configuration is missing on the server. Please check backend environment variables.' });
        setGithubConnecting(false);
      }
    } catch (e) {
      setGithubStatus({ type: 'error', message: 'Failed to initiate GitHub OAuth.' });
      setGithubConnecting(false);
    }
  };

  const handleSyncGithub = async () => {
    setGithubSyncing(true);
    setGithubStatus(null);
    try {
      await fetchApi('/api/settings/github/sync', { method: 'POST' });
      setGithubStatus({ type: 'success', message: 'Repositories synced successfully!' });
      fetchGithub();
    } catch (e) {
      setGithubStatus({ type: 'error', message: 'Failed to sync repositories.' });
    } finally {
      setGithubSyncing(false);
      setTimeout(() => setGithubStatus(null), 3000);
    }
  };

  const handleDisconnectGithub = async () => {
    try {
      await fetchApi('/api/settings/github', { method: 'DELETE' });
      fetchGithub();
    } catch (e) {}
  };

  const handleGenerateKey = async () => {
    if (!newKeyName) return;
    try {
      const data = await fetchApi('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });
      setGeneratedKey(data.rawKey);
      setNewKeyName('');
      fetchApiKeys();
    } catch (e) {}
  };

  const handleRevokeKey = async (id: string) => {
    try {
      await fetchApi(`/api/settings/keys/${id}`, { method: 'DELETE' });
      fetchApiKeys();
    } catch (e) {}
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>
            Manage your organization profile, integrations, and preferences
          </p>
        </div>
      </div>

      <div className={styles.bentoGrid} style={{ gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Organization Profile */}
        <div className={styles.panel}>
          <div className={styles.panelHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 className={styles.panelTitle}>Organization Profile</h3>
            <button 
              onClick={handleSaveOrganization} 
              disabled={orgSaving}
              style={{ padding: '6px 12px', background: 'var(--color-accent-primary)', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
            >
              {orgSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          {orgStatus && (
            <div style={{ marginTop: '10px', padding: '10px', borderRadius: '4px', background: orgStatus.type === 'success' ? '#10b98122' : '#ef444422', color: orgStatus.type === 'success' ? '#10b981' : '#ef4444' }}>
              {orgStatus.message}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Organization Name</label>
              <input 
                type="text" 
                value={orgData.name} 
                onChange={e => setOrgData({...orgData, name: e.target.value})}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border-base)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }} 
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-secondary)' }}>Industry</label>
              <select 
                value={orgData.industry}
                onChange={e => setOrgData({...orgData, industry: e.target.value})}
                style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border-base)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
              >
                <option value="fintech">Financial Technology</option>
                <option value="ecommerce">E-Commerce</option>
                <option value="healthtech">Health Tech</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Integrations</h3>
          </div>
          <div className={styles.insightList} style={{ marginTop: '16px' }}>
            
            <div className={styles.insightItem} style={{ alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
              {githubStatus && (
                <div style={{ width: '100%', padding: '10px', borderRadius: '4px', background: githubStatus.type === 'success' ? '#10b98122' : '#ef444422', color: githubStatus.type === 'success' ? '#10b981' : '#ef4444' }}>
                  {githubStatus.message}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>GitHub Integration</span>
                  {githubData.connected ? (
                    <span className={styles.itemDesc}>Connected ({githubData.connectedAccount}) &bull; {githubData.repositoryCount} repos &bull; Last synced {githubData.lastSyncTime ? new Date(githubData.lastSyncTime).toLocaleString() : 'Never'}</span>
                  ) : (
                    <span className={styles.itemDesc}>Not connected. Connect to sync repositories.</span>
                  )}
                </div>
                {githubData.connected ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleSyncGithub} disabled={githubSyncing} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--color-semantic-info)', color: 'var(--color-semantic-info)', borderRadius: '4px', cursor: githubSyncing ? 'not-allowed' : 'pointer', opacity: githubSyncing ? 0.5 : 1 }}>
                      {githubSyncing ? 'Syncing...' : 'Sync Repos'}
                    </button>
                    <button onClick={handleDisconnectGithub} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--color-semantic-danger)', color: 'var(--color-semantic-danger)', borderRadius: '4px', cursor: 'pointer' }}>
                      Disconnect
                    </button>
                  </div>
                ) : null}
              </div>

              {!githubData.connected && (
                <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleConnectGithub}
                    disabled={githubConnecting}
                    style={{ padding: '8px 16px', background: 'var(--color-accent-primary)', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {githubConnecting ? 'Redirecting...' : 'Connect GitHub'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* API Keys */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>API Keys</h3>
          </div>
          <div style={{ marginTop: '16px' }}>
            
            {generatedKey && (
              <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid var(--color-semantic-success)', background: '#10b98111', borderRadius: '6px' }}>
                <p style={{ color: 'var(--color-semantic-success)', marginBottom: '8px', fontWeight: 'bold' }}>Key Generated! Copy it now, you won't be able to see it again.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" readOnly value={generatedKey} style={{ flex: 1, padding: '8px', fontFamily: 'monospace', borderRadius: '4px', border: '1px solid var(--color-semantic-success)', background: 'transparent', color: 'var(--color-text-primary)' }} />
                  <button onClick={() => navigator.clipboard.writeText(generatedKey)} style={{ padding: '8px 12px', background: 'var(--color-semantic-success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Copy</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="Key Name (e.g. CI/CD Script)"
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border-base)', background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)' }}
              />
              <button 
                onClick={handleGenerateKey}
                disabled={!newKeyName}
                style={{ padding: '8px 16px', background: 'var(--color-bg-surface-elevated)', border: '1px solid var(--color-border-base)', color: 'var(--color-text-primary)', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Generate New Key
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-base)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '8px 4px' }}>Name</th>
                  <th style={{ padding: '8px 4px' }}>Created</th>
                  <th style={{ padding: '8px 4px' }}>Status</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id} style={{ borderBottom: '1px solid var(--color-border-base)' }}>
                    <td style={{ padding: '12px 4px', color: 'var(--color-text-primary)' }}>{key.name}</td>
                    <td style={{ padding: '12px 4px', color: 'var(--color-text-secondary)' }}>{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 4px' }}>
                      {key.revokedAt ? (
                        <span style={{ color: 'var(--color-semantic-danger)', fontSize: '12px', padding: '2px 6px', background: '#ef444422', borderRadius: '12px' }}>Revoked</span>
                      ) : (
                        <span style={{ color: 'var(--color-semantic-success)', fontSize: '12px', padding: '2px 6px', background: '#10b98122', borderRadius: '12px' }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                      {!key.revokedAt && (
                        <button onClick={() => handleRevokeKey(key.id)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--color-semantic-danger)', color: 'var(--color-semantic-danger)', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
                {apiKeys.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No API keys generated yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Danger Zone */}
        <div className={styles.panel} style={{ border: '1px solid var(--color-semantic-danger)' }}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle} style={{ color: 'var(--color-semantic-danger)' }}>Danger Zone</h3>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>Delete Organization</strong>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Permanently delete this organization and all its data.</span>
              </div>
              <button disabled style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-semantic-danger)', color: 'var(--color-semantic-danger)', opacity: 0.5, borderRadius: '4px', cursor: 'not-allowed' }}>
                Delete Organization
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: 'var(--color-text-secondary)' }}>Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
