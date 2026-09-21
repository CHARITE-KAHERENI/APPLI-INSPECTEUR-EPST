import type { UserRole } from '@c3-digital/shared';
import { USER_ROLES } from '@c3-digital/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EnseignantEntity } from '../../enseignants/entities/enseignant.entity';
import { EtablissementEntity } from '../../etablissements/entities/etablissement.entity';
import { InspecteurEntity } from '../../inspecteurs/entities/inspecteur.entity';

export { USER_ROLES };

/**
 * Table `users` : comptes de connexion (authentification JWT). Distincts
 * des référentiels `inspecteurs`/`enseignants` (un `inspecteur` a un
 * compte ET une fiche annuaire, reliées par `inspecteur_id`) — voir
 * `modules/auth` pour la politique d'autorisation par rôle.
 */
@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Index()
  @Column({ type: 'varchar', length: 30 })
  role: UserRole;

  /** Zone d'inspection IGE (ex: "Nord-Kivu 2") — pertinent pour `ige_admin`. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  zone: string | null;

  @Column({ name: 'etablissement_id', type: 'uuid', nullable: true })
  etablissementId: string | null;

  @ManyToOne(() => EtablissementEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: EtablissementEntity | null;

  @Column({ name: 'enseignant_id', type: 'uuid', nullable: true })
  enseignantId: string | null;

  @ManyToOne(() => EnseignantEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'enseignant_id' })
  enseignant: EnseignantEntity | null;

  @Column({ name: 'inspecteur_id', type: 'uuid', nullable: true })
  inspecteurId: string | null;

  @ManyToOne(() => InspecteurEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inspecteur_id' })
  inspecteur: InspecteurEntity | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
