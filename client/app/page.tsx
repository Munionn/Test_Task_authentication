'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for hydration to complete before redirecting
    if (!hasHydrated || isLoading) {
      return;
    }

    if (isAuthenticated) {
      router.push('/profile');
    } else {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
