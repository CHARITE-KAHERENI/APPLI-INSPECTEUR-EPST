import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

/**
 * Accès aux comptes utilisateurs — utilisé par `AuthModule` (login),
 * `RegistrationModule` (inscription en libre-service, PROMPT 10) et les
 * scripts de seed. Pas de contrôleur CRUD public dédié : la gestion
 * d'annuaire passe par les modules métier (`EtablissementsModule` /
 * `InspecteursModule`), qui créent l'utilisateur associé.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }
}
