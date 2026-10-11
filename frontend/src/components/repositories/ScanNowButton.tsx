"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useApiClient } from '../../lib/api/client';

interface ScanNowButtonProps {
  repoUrl: string;
  owner: string;
  repo: string;
}

export function ScanNowButton({ repoUrl, owner, repo }: ScanNowButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { fetchApi } = useApiClient();

  const handleScan = async () => {
    setLoading(true);
    try {
      await fetchApi('http://localhost:4000/api/analysis/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, owner, repo })
      });

      toast.success('Repository scan started!');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleScan}
      disabled={loading}
      style={{
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-base)',
        padding: '10px 20px',
        borderRadius: '6px',
        fontWeight: '500',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        opacity: loading ? 0.7 : 1
      }}
    >
      {loading ? 'Scanning...' : 'Scan Now ↻'}
    </button>
  );
}
