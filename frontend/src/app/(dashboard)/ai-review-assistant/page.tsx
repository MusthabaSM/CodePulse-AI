"use client";

import React, { useState, useEffect } from 'react';
import styles from './Consultant.module.css';
import { useApiClient } from '../../../lib/api/client';

export default function AiReviewAssistantPage() {
  const [repositories, setRepositories] = useState<any[]>([]);
  const [activeRepoId, setActiveRepoId] = useState('');
  const [activeFile, setActiveFile] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [findings, setFindings] = useState<any[]>([]);
  const { fetchApi } = useApiClient();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const repos = await fetchApi(`${apiUrl}/api/analysis/repositories`);
        setRepositories(repos);
        if (repos && repos.length > 0) setActiveRepoId(repos[0].id);
      } catch (e) {
        console.error('Failed to fetch repos', e);
      }
    };
    fetchRepos();
  }, [apiUrl]);

  const handleRunReview = () => {
    setIsRunning(true);
    setTimeout(() => {
      setFindings([
        { id: 'F-001', description: 'Hardcoded credentials in connection string.', evidence: 'Supported', semantic: 'Validated' },
        { id: 'F-002', description: 'Missing error boundary in API route.', evidence: 'Supported', semantic: 'Validated' }
      ]);
      setIsRunning(false);
    }, 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Review Assistant</h1>
        <p className={styles.subtitle}>Run targeted semantic reviews on your codebase.</p>
      </div>

      <div className={styles.topControls}>
        <div className={styles.statusPanel}>
          <div className={styles.statusItem}>
            <span className={styles.contextLabel}>Provider Information</span>
            <span className={styles.contextValue}>Gemini-2.5-Flash</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.contextLabel}>Review History</span>
            <span className={styles.contextValue}>12 Past Reviews</span>
          </div>
        </div>

        <select 
          className={styles.repoSelect}
          value={activeRepoId}
          onChange={(e) => setActiveRepoId(e.target.value)}
        >
          <option value="" disabled>Repository Selection</option>
          {repositories.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <input 
          type="text" 
          placeholder="File Selection (e.g., src/main.ts)" 
          className={styles.repoSelect}
          value={activeFile}
          onChange={(e) => setActiveFile(e.target.value)}
          style={{ marginLeft: '12px' }}
        />

        <button 
          className={styles.sendButton} 
          onClick={handleRunReview}
          disabled={isRunning || !activeRepoId || !activeFile}
          style={{ marginLeft: '12px' }}
        >
          {isRunning ? 'Running...' : 'Run Review'}
        </button>
      </div>

      <div className={styles.chatBox} style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Findings Table</h3>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-base)' }}>
              <th style={{ padding: '12px' }}>Finding ID</th>
              <th style={{ padding: '12px' }}>Description</th>
              <th style={{ padding: '12px' }}>Evidence Validation</th>
              <th style={{ padding: '12px' }}>Semantic Validation</th>
            </tr>
          </thead>
          <tbody>
            {findings.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>No findings yet. Run a review to generate insights.</td></tr>
            ) : (
              findings.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border-base)' }}>
                  <td style={{ padding: '12px', color: 'var(--color-text-primary)' }}>{f.id}</td>
                  <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>{f.description}</td>
                  <td style={{ padding: '12px', color: 'var(--color-semantic-success)' }}>{f.evidence}</td>
                  <td style={{ padding: '12px', color: 'var(--color-semantic-success)' }}>{f.semantic}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
