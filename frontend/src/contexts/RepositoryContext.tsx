'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApiClient } from '../lib/api/client';

export interface Repository {
  id: string;
  name: string;
  owner: string;
}

export interface RepositoryContextType {
  repositories: Repository[];
  selectedRepositoryId: string | null;
  setSelectedRepositoryId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchApi } = useApiClient();

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        setLoading(true);
        const data = await fetchApi('/api/analysis/repositories');
        if (Array.isArray(data)) {
          setRepositories(data);
          
          if (data.length > 0) {
            // Priority 1: URL Parameter
            const urlParams = new URLSearchParams(window.location.search);
            const urlRepo = urlParams.get('repo');
            if (urlRepo && data.some(r => r.id === urlRepo)) {
              setSelectedRepositoryId(urlRepo);
              localStorage.setItem('selectedRepositoryId', urlRepo);
              return;
            }

            // Priority 2: LocalStorage
            const storedRepo = localStorage.getItem('selectedRepositoryId');
            if (storedRepo && data.some(r => r.id === storedRepo)) {
              setSelectedRepositoryId(storedRepo);
              return;
            }

            // Priority 3: First available repository
            setSelectedRepositoryId(data[0].id);
            localStorage.setItem('selectedRepositoryId', data[0].id);
          } else {
            setSelectedRepositoryId(null);
            localStorage.removeItem('selectedRepositoryId');
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch repositories', err);
        setError('Failed to load repositories');
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, [fetchApi]);

  const handleSelectRepository = (id: string | null) => {
    setSelectedRepositoryId(id);
    if (id) {
      localStorage.setItem('selectedRepositoryId', id);
    } else {
      localStorage.removeItem('selectedRepositoryId');
    }
  };

  return (
    <RepositoryContext.Provider
      value={{
        repositories,
        selectedRepositoryId,
        setSelectedRepositoryId: handleSelectRepository,
        loading,
        error
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}
