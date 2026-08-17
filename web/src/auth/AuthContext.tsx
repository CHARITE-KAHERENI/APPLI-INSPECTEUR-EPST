import type { AuthUser, LoginResponse } from '@c3-digital/shared';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AUTH_UNAUTHORIZED_EVENT, api, TOKEN_STORAGE_KEY } from '../lib/api';
import { AuthContext } from './authContextObject';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  // Restaure la session à partir du jeton stocké (rechargement de page).
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => localStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  // Jeton expiré/invalide détecté par l'intercepteur axios (voir lib/api.ts).
  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
    setUser(data.user);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}
