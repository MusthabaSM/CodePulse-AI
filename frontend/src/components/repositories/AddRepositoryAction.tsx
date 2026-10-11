"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useApiClient } from '../../lib/api/client';

export function AddRepositoryAction() {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { fetchApi } = useApiClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Parse owner and repo from Github URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!match) {
      toast.error('Invalid GitHub URL. Must be like https://github.com/owner/repo');
      return;
    }

    const owner = match[1];
    const repo = match[2];

    setLoading(true);
    try {
      await fetchApi('http://localhost:4000/api/analysis/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, owner, repo })
      });

      toast.success('Repository analysis triggered!');
      setIsOpen(false);
      setUrl('');
      // Refresh the page data
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          background: 'var(--color-accent-primary)',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '6px',
          fontWeight: '500',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 112, 243, 0.2)'
        }}
      >
        + Add Repository
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            background: 'var(--color-bg-elevated)',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '12px',
            border: '1px solid var(--color-border-base)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Add Repository</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>GitHub Repository URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://github.com/expressjs/express"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border-base)',
                    background: 'var(--color-bg-base)',
                    color: 'var(--color-text-primary)',
                    outline: 'none'
                  }}
                  disabled={loading}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border-base)',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--color-accent-primary)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Adding...' : 'Add Repository'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
