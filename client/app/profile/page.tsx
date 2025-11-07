'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import EditProfileModal from '@/components/EditProfileModal';
import ErrorAlert from '@/components/ErrorAlert';
import { getErrorMessages } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    hasHydrated,
    logout,
    fetchProfile,
    error,
    clearError,
  } = useAuthStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [serverError, setServerError] = useState<string[]>([]);

  // Ensure hasHydrated is set on client side
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasHydrated) {
      const store = useAuthStore.getState();
      if (store && !store.hasHydrated) {
        store.setHasHydrated(true);
      }
    }
  }, [hasHydrated]);

  useEffect(() => {
    // Wait for hydration to complete before checking authentication
    if (!hasHydrated || isLoading) {
      return;
    }

    // If not authenticated after hydration, redirect to login
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If authenticated but no user data, fetch profile
    // This should be handled by initializeAuth in the store, but we check here as a fallback
    if (isAuthenticated && !user) {
      fetchProfile().catch((err) => {
        const errorMessages = getErrorMessages(err);
        setServerError(errorMessages);
        // If fetch fails, redirect to login
        router.push('/login');
      });
    }
  }, [hasHydrated, isAuthenticated, isLoading, user, router, fetchProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      const errorMessages = getErrorMessages(err);
      setServerError(errorMessages);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Show loading while hydrating or loading
  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading if authenticated but user data is being fetched
  if (isAuthenticated && !user && !serverError.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              Home
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(serverError.length > 0 || error) && (
          <div className="mb-6">
            <ErrorAlert
              message={serverError.length > 0 ? serverError : error || ''}
              onClose={() => {
                setServerError([]);
                clearError();
              }}
            />
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center text-3xl font-bold text-blue-600 shadow-lg">
                  {getInitials(user.name)}
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">{user.name}</h1>
                <p className="mt-1 text-blue-100">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="px-6 py-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 break-all">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">User ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono text-xs break-all">
                      {user.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-6 border-t border-gray-200 flex space-x-3">
                <Link
                  href="/profile/edit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
      />
    </div>
  );
}

