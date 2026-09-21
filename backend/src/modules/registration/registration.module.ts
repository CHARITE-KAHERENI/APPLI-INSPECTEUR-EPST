import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EtablissementsModule } from '../etablissements/etablissements.module';
import { InspecteursModule } from '../inspecteurs/inspecteurs.module';
import { UsersModule } from '../users/users.module';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

/**
 * Inscription en libre-service (PROMPT 10) — module séparé plutôt
 * qu'ajouté à `AuthModule` : `EtablissementsModule`/`InspecteursModule`
 * importent déjà `AuthModule` (pour `JwtAuthGuard`/`RolesGuard`), donc
 * l'inverse créerait une dépendance circulaire. Ce module, lui, n'est
 * importé par personne : aucun cycle.
 */
@Module({
  imports: [AuthModule, UsersModule, EtablissementsModule, InspecteursModule],
  controllers: [RegistrationController],
  providers: [RegistrationService],
})
export class RegistrationModule {}
