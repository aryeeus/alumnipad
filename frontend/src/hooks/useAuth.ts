import { useState, useEffect } from 'react';
import { saveAuth, clearAuth, getStoredUser, type StoredUser } from '@/lib/auth';
import { authApi } from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      saveAuth(data.token, data.user);
      setUser(data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return { user, loading, login, logout, isAdmin: user?.is_admin ?? false };
}

// Simple context-free check used in route guards
export function useCurrentUser(): StoredUser | null {
  const [user, setUser] = useState<StoredUser | null>(getStoredUser);
  useEffect(() => {
    const handler = () => setUser(getStoredUser());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  return user;
}
