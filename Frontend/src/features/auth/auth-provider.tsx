'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/services/api';
import { setActivePortalRole } from '@/lib/portal';
import type { User } from '@/types/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSession = useCallback(
    () =>
      api
        .get<{ user: User }>('/auth/me')
        .then((result) => {
          setUser(result.user);
          setActivePortalRole(result.user.role);
          setError('');
        })
        .catch((error) => {
          setUser(null);
          if (!(error instanceof ApiError && error.status === 401)) {
            setError(error instanceof Error ? error.message : 'Unable to verify your session.');
          }
        })
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void loadSession();
  }, [loadSession]);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setActivePortalRole(null);
      router.replace('/login?expired=1');
    };
    window.addEventListener('teamora:session-expired', expired);
    return () => window.removeEventListener('teamora:session-expired', expired);
  }, [router]);
  async function refresh() {
    setLoading(true);
    setError('');
    await loadSession();
  }
  const handleSetUser = useCallback((newUser: User | null) => {
    setUser(newUser);
    setActivePortalRole(newUser?.role ?? null);
  }, []);

  async function logout() {
    await api.mutate('/auth/logout');
    setUser(null);
    setActivePortalRole(null);
    router.replace('/login');
  }
  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, setUser: handleSetUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}
