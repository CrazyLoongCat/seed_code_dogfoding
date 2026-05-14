const STORAGE_KEY = 'labelher-auth';

export const getTokenFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token || null;
    }
    return null;
  } catch {
    return null;
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
};
