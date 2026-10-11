"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AutoRefresher({ isActive }: { isActive: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isActive) return;

    const intervalId = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isActive, router]);

  return null;
}
