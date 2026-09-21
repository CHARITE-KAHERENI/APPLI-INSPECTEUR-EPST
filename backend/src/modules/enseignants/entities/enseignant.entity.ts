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
import { EtablissementEntity } from '../../etablissements/entities/etablissement.entity';

/** Table `enseignants` : référentiel des enseignants pouvant être inspectés. */
@Entity({ name: 'enseignants' })
export class EnseignantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  sexe: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  matiere: string | null;

  @Index()
  @Column({ name: 'etablissement_id', type: 'uuid', nullable: true })
  etablissementId: string | null;

  @ManyToOne(() => EtablissementEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'etablissement_id' })
  etablissement: EtablissementEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
