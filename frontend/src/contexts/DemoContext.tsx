"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(true);

  // In a real app, you might persist this to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('codepulse_demo_mode');
    if (saved) {
      setIsDemoMode(saved === 'true');
    }
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode(prev => {
      const newVal = !prev;
      localStorage.setItem('codepulse_demo_mode', String(newVal));
      return newVal;
    });
    // Force reload to ensure fresh data fetching states
    window.location.reload();
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
}
