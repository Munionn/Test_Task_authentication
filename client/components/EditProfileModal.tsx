'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from '@/lib/validations';
import { useAuthStore } from '@/store/authStore';
import { getErrorMessages } from '@/lib/api';
import ErrorAlert from '@/components/ErrorAlert';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { email: string; name: string };
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
}: EditProfileModalProps) {
  const { updateProfile } = useAuthStore();
  const [serverError, setServerError] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      email: user.email,
      name: user.name,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        email: user.email,
        name: user.name,
      });
      setServerError([]);
    }
  }, [isOpen, user, reset]);

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      setServerError([]);
      const updateData: { email?: string; name?: string } = {};
      
      // Only include fields that have changed
      if (data.email && data.email.trim() && data.email !== user.email) {
        updateData.email = data.email.trim();
      }
      if (data.name && data.name.trim() && data.name !== user.name) {
        updateData.name = data.name.trim();
      }

      if (Object.keys(updateData).length === 0) {
        onClose();
        return;
      }

      await updateProfile(updateData);
      onClose();
    } catch (err) {
      const errorMessages = getErrorMessages(err);
      setServerError(errorMessages);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Edit Profile
                  </h3>

                  {serverError.length > 0 && (
                    <ErrorAlert
                      message={serverError}
                      onClose={() => setServerError([])}
                    />
                  )}

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Email
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Name
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

