"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div style={{ width: 80, height: 32 }} />; // Placeholder

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'var(--color-bg-surface-elevated)',
      border: '1px solid var(--color-border-base)',
      borderRadius: 'var(--radius-full)',
      padding: '2px',
      gap: '2px',
    }}>
      <button
        onClick={() => setTheme('light')}
        style={{
          padding: '4px 8px',
          borderRadius: 'var(--radius-full)',
          background: theme === 'light' ? 'var(--color-bg-surface-hover)' : 'transparent',
          color: theme === 'light' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          fontSize: '12px',
          cursor: 'pointer',
          border: 'none',
          transition: 'all 0.2s',
        }}
        title="Light Mode"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
      </button>
      <button
        onClick={() => setTheme('system')}
        style={{
          padding: '4px 8px',
          borderRadius: 'var(--radius-full)',
          background: theme === 'system' ? 'var(--color-bg-surface-hover)' : 'transparent',
          color: theme === 'system' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          fontSize: '12px',
          cursor: 'pointer',
          border: 'none',
          transition: 'all 0.2s',
        }}
        title="System Preference"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      </button>
      <button
        onClick={() => setTheme('dark')}
        style={{
          padding: '4px 8px',
          borderRadius: 'var(--radius-full)',
          background: theme === 'dark' ? 'var(--color-bg-surface-hover)' : 'transparent',
          color: theme === 'dark' ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
          fontSize: '12px',
          cursor: 'pointer',
          border: 'none',
          transition: 'all 0.2s',
        }}
        title="Dark Mode"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  );
}
