import type { LoginResponse } from '@c3-digital/shared';
import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { EtablissementsService } from '../etablissements/etablissements.service';
import { InspecteursService } from '../inspecteurs/inspecteurs.service';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterEtablissementDto } from './dto/register-etablissement.dto';
import { RegisterInspecteurDto } from './dto/register-inspecteur.dto';

/**
 * Inscription en libre-service (PROMPT 10) : un chef d'établissement crée
 * son école, ou un inspecteur crée son compte, sans intervention de
 * l'IGE — cohérent avec l'essai gratuit de 14 jours déjà auto-activé à
 * la création d'un établissement/inspecteur (voir PROMPT 7,
 * `SubscribersService`). Les deux méthodes réutilisent volontairement
 * les mêmes services que les routes admin (`EtablissementsService.create`
 * /`InspecteursService.create`), pour ne jamais dupliquer la logique
 * d'activation d'essai : seule la porte d'entrée diffère (publique ici,
 * réservée ige_admin/super_admin sur `POST /etablissements`/`POST
 * /inspecteurs`).
 */
@Injectable()
export class RegistrationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly etablissementsService: EtablissementsService,
    private readonly inspecteursService: InspecteursService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  async registerEtablissement(
    dto: RegisterEtablissementDto,
  ): Promise<LoginResponse> {
    const email = await this.ensureEmailAvailable(dto.email);

    const etablissement = await this.etablissementsService.create({
      nom: dto.etablissementNom,
      code: dto.code,
      province: dto.province,
      sousDivision: dto.sousDivision,
      milieu: dto.milieu,
      zone: dto.zone,
    });

    const user = await this.usersService.create({
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      fullName: dto.chefNomComplet,
      role: 'chef_etablissement',
      etablissementId: etablissement.id,
      zone: dto.zone ?? null,
    });

    return this.issueToken(user);
  }

  async registerInspecteur(dto: RegisterInspecteurDto): Promise<LoginResponse> {
    const email = await this.ensureEmailAvailable(dto.email);

    const inspecteur = await this.inspecteursService.create({
      nom: dto.nom,
      sexe: dto.sexe,
      posteAttache: dto.posteAttache,
      zone: dto.zone,
    });

    const user = await this.usersService.create({
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      fullName: dto.nom,
      role: 'inspecteur',
      inspecteurId: inspecteur.id,
      zone: dto.zone ?? null,
    });

    return this.issueToken(user);
  }

  /** @returns l'e-mail normalisé (minuscules, sans espaces) à utiliser pour la création. */
  private async ensureEmailAvailable(rawEmail: string): Promise<string> {
    const email = rawEmail.toLowerCase().trim();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        'Un compte existe déjà avec cette adresse e-mail.',
      );
    }
    return email;
  }

  /** Même format de jeton que `POST /auth/login`, pour une connexion immédiate après inscription. */
  private async issueToken(user: UserEntity): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken, user: this.authService.toAuthUser(user) };
  }
}
