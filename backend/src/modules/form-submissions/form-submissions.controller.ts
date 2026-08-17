import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
import { UserEntity } from '../users/entities/user.entity';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { QueryFormSubmissionDto } from './dto/query-form-submission.dto';
import { UpdateFormSubmissionStatusDto } from './dto/update-form-submission-status.dto';
import { FormSubmissionsService } from './form-submissions.service';

@UseGuards(JwtAuthGuard)
@Controller('form-submissions')
export class FormSubmissionsController {
  constructor(
    private readonly formSubmissionsService: FormSubmissionsService,
  ) {}

  /**
   * Crée un formulaire en statut "brouillon" (saisie initiale,
   * potentiellement hors-ligne). `SubscriptionGuard` bloque cette route
   * pour un compte `chef_etablissement`/`inspecteur` en lecture seule
   * (essai/abonnement expiré) — voir PROMPT 7, point 3.
   */
  @UseGuards(SubscriptionGuard)
  @Post()
  create(@Body() dto: CreateFormSubmissionDto) {
    return this.formSubmissionsService.create(dto);
  }

  /**
   * Cartes de synthèse + graphique du tableau de bord IGE (web) — voir
   * PROMPT 6 : nombre d'inspections par formulaire, score moyen par
   * formulaire, établissements actifs, dernières inspections. Déclarée
   * avant `:id` pour que "stats" ne soit pas interprété comme un
   * identifiant.
   */
  @Get('stats')
  stats(@CurrentUser() user: UserEntity) {
    return this.formSubmissionsService.stats(user);
  }

  /** Page "Inspections" (web) : liste filtrée, restreinte au périmètre du rôle de l'utilisateur. */
  @Get()
  findAll(
    @CurrentUser() user: UserEntity,
    @Query() query: QueryFormSubmissionDto,
  ) {
    return this.formSubmissionsService.findAllScopedForUser(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.formSubmissionsService.findOneScoped(id, user);
  }

  /** Fait transitionner le statut : brouillon -> soumis -> synchronise. */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFormSubmissionStatusDto,
  ) {
    return this.formSubmissionsService.updateStatus(id, dto.status);
  }
}
