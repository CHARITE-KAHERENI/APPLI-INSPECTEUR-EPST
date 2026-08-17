import type { UserRole } from '@c3-digital/shared';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restreint une route aux rôles listés — à combiner avec `JwtAuthGuard` + `RolesGuard`. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
