import type { AuthUser } from '@c3-digital/shared';
import { createContext } from 'react';

export interface AuthContextValue {
  user: AuthUser | null;
  /** `true` pendant la restauration de session au démarrage (jeton en localStorage -> `GET /auth/me`). */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
