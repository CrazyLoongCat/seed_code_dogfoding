import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../lib/api';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(credentials);
          const { token, user } = response.data;
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
          return { success: true };
        } catch (error) {
          set({
            error: error.response?.data?.error || '登录失败',
            isLoading: false
          });
          return { success: false, error: error.response?.data?.error || '登录失败' };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register(userData);
          const { token, user } = response.data;
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          });
          return { success: true };
        } catch (error) {
          set({
            error: error.response?.data?.error || '注册失败',
            isLoading: false
          });
          return { success: false, error: error.response?.data?.error || '注册失败' };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        });
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated })
    }
  )
);

export default useAuthStore;
