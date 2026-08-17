/**
 * Modèle d'authentification et d'autorisation partagé entre le backend
 * (NestJS, JWT) et le web (React) — voir `backend/src/modules/auth`.
 */

/**
 * Les 5 rôles de la plateforme :
 * - `inspecteur`         : voit ses propres inspections
 * - `enseignant`         : voit les inspections le concernant
 * - `chef_etablissement` : voit les inspections de son établissement
 * - `ige_admin`          : voit les inspections de sa zone (ex: "Nord-Kivu 2")
 * - `super_admin`        : voit tout, sans restriction
 */
export const USER_ROLES = [
  'inspecteur',
  'enseignant',
  'chef_etablissement',
  'ige_admin',
  'super_admin',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Profil de l'utilisateur authentifié, tel que renvoyé par `GET /auth/me`. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  /**
   * Zone d'inspection IGE (ex: "Nord-Kivu 2") — utilisée pour délimiter ce
   * qu'un `ige_admin` peut consulter. Sans objet pour les autres rôles.
   */
  zone?: string | null;
  /** Établissement rattaché — utilisé pour délimiter ce qu'un `chef_etablissement` peut consulter. */
  etablissementId?: string | null;
  /** Enseignant rattaché — utilisé pour délimiter ce qu'un `enseignant` peut consulter. */
  enseignantId?: string | null;
  /** Inspecteur rattaché — utilisé pour délimiter ce qu'un `inspecteur` peut consulter. */
  inspecteurId?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
