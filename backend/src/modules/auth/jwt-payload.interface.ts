import type { UserRole } from '@c3-digital/shared';

/** Contenu du JWT émis par `POST /auth/login` — voir `AuthService.login`. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
