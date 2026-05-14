import { create } from 'zustand';
import { authAPI } from '../lib/api';

const STORAGE_KEY = 'labelher-auth';

const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load auth from storage:', e);
  }
  return { user: null, token: null, isAuthenticated: false };
};

const saveToStorage = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated
    }));
  } catch (e) {
    console.error('Failed to save auth to storage:', e);
  }
};

const initialState = loadFromStorage();

const useAuthStore = create((set) => ({
  user: initialState.user,
  token: initialState.token,
  isAuthenticated: initialState.isAuthenticated,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      const newState = {
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      };
      set(newState);
      saveToStorage(newState);
      return { success: true };
    } catch (error) {
      const newState = {
        error: error.response?.data?.error || '登录失败',
        isLoading: false
      };
      set(newState);
      return { success: false, error: newState.error };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      const newState = {
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      };
      set(newState);
      saveToStorage(newState);
      return { success: true };
    } catch (error) {
      const newState = {
        error: error.response?.data?.error || '注册失败',
        isLoading: false
      };
      set(newState);
      return { success: false, error: newState.error };
    }
  },

  logout: () => {
    const newState = {
      user: null,
      token: null,
      isAuthenticated: false
    };
    set(newState);
    localStorage.removeItem(STORAGE_KEY);
  },

  clearError: () => set({ error: null })
}));

export default useAuthStore;
