'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from '@/lib/validations';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessages } from '@/lib/api';
import ErrorAlert from '@/components/ErrorAlert';

export default function EditProfilePage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    hasHydrated,
    updateProfile,
    fetchProfile,
    error,
    clearError,
  } = useAuthStore();
  const [serverError, setServerError] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      email: user?.email || '',
      name: user?.name || '',
    },
  });

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

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // If authenticated but no user data, fetch profile
    if (isAuthenticated && !user) {
      fetchProfile().catch((err) => {
        const errorMessages = getErrorMessages(err);
        setServerError(errorMessages);
        router.push('/profile');
      });
    }
  }, [hasHydrated, isAuthenticated, isLoading, user, router, fetchProfile]);

  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        name: user.name,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      setIsSubmitting(true);
      setServerError([]);
      clearError();

      const updateData: { email?: string; name?: string } = {};
      if (data.email && data.email !== user?.email) {
        updateData.email = data.email;
      }
      if (data.name && data.name !== user?.name) {
        updateData.name = data.name;
      }

      if (Object.keys(updateData).length === 0) {
        // No changes, just go back
        router.push('/profile');
        return;
      }

      await updateProfile(updateData);
      router.push('/profile');
    } catch (err) {
      const errorMessages = getErrorMessages(err);
      setServerError(errorMessages);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/profile');
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
              href="/profile"
              className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              ← Back to Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Update your account information. Password cannot be changed here.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6">
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

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  id="name"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Password Change
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Password changes are not available on this page. Please
                        contact support if you need to change your password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

