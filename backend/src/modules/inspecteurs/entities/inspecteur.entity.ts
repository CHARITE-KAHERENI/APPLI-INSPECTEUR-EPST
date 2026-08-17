import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Table `inspecteurs` : référentiel des inspecteurs de l'IGE. */
@Entity({ name: 'inspecteurs' })
export class InspecteurEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  sexe: string | null;

  @Column({ name: 'poste_attache', type: 'varchar', length: 255, nullable: true })
  posteAttache: string | null;

  /** Zone d'inspection IGE (ex: "Nord-Kivu 2") — voir `UserEntity.zone`. */
  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  zone: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
