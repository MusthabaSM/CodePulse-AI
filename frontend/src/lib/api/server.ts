import { auth } from '@clerk/nextjs/server';

export class ServerApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ServerApiError';
  }
}

export async function serverFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const { getToken, userId, orgId } = await auth();
    const token = await getToken();
    
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    const plainHeaders: Record<string, string> = {};
    headers.forEach((value, key) => {
      plainHeaders[key] = value;
    });

    if (!plainHeaders['content-type'] && options.method !== 'GET' && options.method !== 'DELETE') {
      plainHeaders['content-type'] = 'application/json';
    }

    console.log(`\n[SERVER]`);
    console.log(`auth() success: true`);
    console.log(`User ID: ${userId || 'null'}`);
    console.log(`Organization ID: ${orgId || 'null'}`);
    console.log(`\n`);

    const response = await fetch(endpoint, { ...options, headers: plainHeaders });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('[API SERVER] 401 Unauthorized - Token may be invalid or expired.');
        throw new ServerApiError(401, 'Unauthorized');
      }
      
      const errorText = await response.text();
      throw new ServerApiError(response.status, errorText || 'API Request Failed');
    }

    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw error;
    }
    throw new ServerApiError(500, error instanceof Error ? error.message : 'Unknown Error');
  }
}
