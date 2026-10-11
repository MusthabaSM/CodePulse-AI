"use client";

import React from 'react';
import { ClerkProvider, useUser, useAuth, SignInButton, UserButton } from '@clerk/nextjs';

/**
 * We wrap the Clerk provider so we can easily swap to NextAuth or Auth0 in the future.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Hardcoded publishable key matching the backend's CLERK_SECRET_KEY application
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_Y3VycmVudC1iYXNpbGlzay05NC5jbGVyay5hY2NvdW50cy5kZXYk"}>
      {children}
    </ClerkProvider>
  );
}

/**
 * Custom hook to abstract the underlying Auth provider.
 */
export function useAppAuth() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { orgId, orgRole } = useAuth();

  return {
    isLoaded,
    isAuthenticated: !!isSignedIn,
    user: user ? {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      fullName: user.fullName,
      imageUrl: user.imageUrl,
    } : null,
    organization: orgId ? {
      id: orgId,
      role: orgRole
    } : null
  };
}

/**
 * Re-exporting UI components to avoid direct Clerk coupling in the main app.
 */
export function LoginButton() {
  return <SignInButton mode="modal"><button style={{ background: 'var(--color-accent-primary)', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Sign In</button></SignInButton>;
}

export function UserProfileButton() {
  return <UserButton />;
}
