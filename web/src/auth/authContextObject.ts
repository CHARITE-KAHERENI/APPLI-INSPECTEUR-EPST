import type { AuthUser } from '@c3-digital/shared';
import { createContext } from 'react';

export interface RegisterEtablissementPayload {
  etablissementNom: string;
  code?: string;
  province?: string;
  sousDivision?: string;
  milieu?: string;
  zone?: string;
  chefNomComplet: string;
  email: string;
  password: string;
}

export interface RegisterInspecteurPayload {
  nom: string;
  sexe?: string;
  posteAttache?: string;
  zone?: string;
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  /** `true` pendant la restauration de session au démarrage (jeton en localStorage -> `GET /auth/me`). */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerEtablissement: (payload: RegisterEtablissementPayload) => Promise<void>;
  registerInspecteur: (payload: RegisterInspecteurPayload) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
