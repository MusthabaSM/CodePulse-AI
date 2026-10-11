"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ScanningProgress({ 
  initialProgress, 
  stage, 
  isActive 
}: { 
  initialProgress: number, 
  stage: string,
  isActive: boolean
}) {
  const [displayProgress, setDisplayProgress] = useState(initialProgress);
  const router = useRouter();

  // Poll server state every 2 seconds instead of AutoRefresher
  useEffect(() => {
    if (!isActive) return;
    const intervalId = setInterval(() => {
      router.refresh();
    }, 2000);
    return () => clearInterval(intervalId);
  }, [isActive, router]);

  // If server progress jumps ahead, catch up smoothly
  useEffect(() => {
    if (initialProgress > displayProgress) {
      setDisplayProgress(initialProgress);
    }
  }, [initialProgress]);

  // Simulate smooth fake progress ticking up 1% at a time
  useEffect(() => {
    if (!isActive) return;
    const fakeProgressInterval = setInterval(() => {
      setDisplayProgress(prev => {
        // Only fake increment up to 99%, wait for real 100%
        if (prev < 99) {
           return prev + 1;
        }
        return prev;
      });
    }, 300); // Ticks 1% every 300ms

    return () => clearInterval(fakeProgressInterval);
  }, [isActive]);

  // When inactive (finished), make sure it shows 100% shortly before hiding
  useEffect(() => {
    if (!isActive && initialProgress === 100) {
      setDisplayProgress(100);
    }
  }, [isActive, initialProgress]);

  if (!isActive) return null;

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', borderLeft: '4px solid var(--color-semantic-info)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-text-primary)' }}>Scanning Repository</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '14px' }}>{stage}</p>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-semantic-info)' }}>
          {displayProgress}%
        </div>
      </div>
      <div style={{ width: '100%', height: '8px', background: 'var(--color-bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          width: `${displayProgress}%`, 
          background: 'var(--color-semantic-info)',
          transition: 'width 0.3s ease-in-out'
        }} />
      </div>
    </div>
  );
}
