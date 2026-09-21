import type { LoginResponse } from '@c3-digital/shared';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RegisterEtablissementDto } from './dto/register-etablissement.dto';
import { RegisterInspecteurDto } from './dto/register-inspecteur.dto';
import { RegistrationService } from './registration.service';

/**
 * Routes publiques (aucun `@UseGuards`) — voir `RegistrationService` pour
 * le raisonnement. Montées sous `/auth` : ce sont, du point de vue du
 * client, des variantes de connexion ("inscription puis connexion
 * immédiate"), pas des routes de gestion d'annuaire.
 */
@Controller('auth')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('register-etablissement')
  @HttpCode(HttpStatus.CREATED)
  registerEtablissement(
    @Body() dto: RegisterEtablissementDto,
  ): Promise<LoginResponse> {
    return this.registrationService.registerEtablissement(dto);
  }

  @Post('register-inspecteur')
  @HttpCode(HttpStatus.CREATED)
  registerInspecteur(
    @Body() dto: RegisterInspecteurDto,
  ): Promise<LoginResponse> {
    return this.registrationService.registerInspecteur(dto);
  }
}
