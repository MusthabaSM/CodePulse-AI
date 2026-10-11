import { useAuth } from '@clerk/nextjs';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

import { useCallback } from 'react';

export function useApiClient() {
  const { getToken } = useAuth();

  const fetchApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    try {
      const token = await getToken();
      
      const headers = new Headers(options.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      const plainHeaders: Record<string, string> = {};
      headers.forEach((value, key) => {
        plainHeaders[key] = value;
      });

      // Ensure we send/receive JSON by default
      if (!plainHeaders['content-type'] && options.method !== 'GET' && options.method !== 'DELETE') {
        plainHeaders['content-type'] = 'application/json';
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

      console.log(`\n[CLIENT]`);
      console.log(`Route: ${endpoint}`);
      console.log(`Token Present: ${!!token}`);
      console.log(`Authorization Present: ${!!plainHeaders['Authorization'] || !!plainHeaders['authorization']}`);
      console.log(`\n`);

      const response = await fetch(url, { ...options, headers: plainHeaders });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('[API CLIENT] 401 Unauthorized - Token may be invalid or expired.');
          // Graceful handling could involve triggering a clerk re-auth or redirect, 
          // but throwing allows the component to catch and handle UI state.
          throw new ApiError(401, 'Unauthorized');
        }
        
        const errorText = await response.text();
        throw new ApiError(response.status, errorText || 'API Request Failed');
      }

      // If it's a 204 No Content, don't try to parse JSON
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown Error');
    }
  }, [getToken]);

  return { fetchApi };
}
