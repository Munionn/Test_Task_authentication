'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/lib/api';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: { email?: string; name?: string }) => Promise<void>;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get): AuthState => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({ email, password, name });
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          await authApi.logout();
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Logout request failed, but clearing local state anyway:', error);
          }
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await authApi.getProfile();
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: error instanceof Error ? error.message : 'Failed to fetch profile',
          });
          throw error;
        }
      },

      updateProfile: async (data: { email?: string; name?: string }) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.updateProfile(data);
          set({
            user: response.user,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Update failed',
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      initializeAuth: async () => {
        const state = get();
        // If we have isAuthenticated but no user, try to fetch profile
        if (state.isAuthenticated && !state.user) {
          try {
            await state.fetchProfile();
          } catch {
            // If fetch fails, user is not actually authenticated
            set({ isAuthenticated: false, user: null });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => {
        // Check if we're in browser environment
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          // Always set hasHydrated to true, even on error
          if (state) {
            state.setHasHydrated(true);
            // Initialize auth if needed (check if authenticated but no user)
            if (state.isAuthenticated && !state.user) {
              // Call initializeAuth after a short delay to ensure state is ready
              setTimeout(() => {
                state.initializeAuth().catch(() => {
                  // Silently fail - error is already handled in initializeAuth
                });
              }, 0);
            }
          } else {
            // Set hasHydrated even if state is null or on error
            if (error) {
              console.error('Error rehydrating auth store:', error);
            }
            // Use setTimeout to avoid calling setState during render
            setTimeout(() => {
              const store = useAuthStore.getState();
              if (store) {
                store.setHasHydrated(true);
              }
            }, 0);
          }
        };
      },
    }
  )
);

