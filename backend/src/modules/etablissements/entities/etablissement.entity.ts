import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Table `etablissements` : référentiel des écoles inspectées. Distinct du
 * texte libre saisi dans `form_submissions.header` (ex: "Etablissement :
 * Institut de la Paix") — voir la migration `CreateAuthAndDirectory` pour
 * le lien optionnel entre les deux.
 */
@Entity({ name: 'etablissements' })
export class EtablissementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({
    name: 'sous_division',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  sousDivision: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  milieu: string | null;

  /** Zone d'inspection IGE (ex: "Nord-Kivu 2") — voir `UserEntity.zone`. */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  zone: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
