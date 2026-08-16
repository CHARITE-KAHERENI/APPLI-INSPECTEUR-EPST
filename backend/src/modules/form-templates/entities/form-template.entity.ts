import type {
  ConversionTable,
  FormCode,
  FormFieldGroup,
  FormHeaderTemplate,
  FormSectionTemplate,
  SignatureZoneTemplate,
  SynthesisTemplate,
} from '@c3-digital/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Portion "définition" d'un `FormTemplate` partagé : ce qui varie par
 * formulaire (en-tête, groupes de champs non notés, sections/critères,
 * tableau de conversion, synthèse finale, signatures). `id`, `code`,
 * `name`, `version`, `description` et `isActive` sont des colonnes
 * natives de la table pour rester interrogeables sans creuser le JSONB.
 */
export interface FormTemplateDefinition {
  header: FormHeaderTemplate;
  fieldGroups: FormFieldGroup[];
  sections: FormSectionTemplate[];
  conversionTable: ConversionTable;
  synthesis: SynthesisTemplate;
  signatures: SignatureZoneTemplate;
}

/**
 * Table `form_templates` : les configurations des 5 formulaires officiels
 * IGE (C2, C3, C3B, C3M, C3_DAS), versionnées.
 */
@Entity({ name: 'form_templates' })
@Unique('uq_form_templates_code_version', ['code', 'version'])
export class FormTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  code: FormCode;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
  version: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Voir {@link FormTemplateDefinition} — miroir de shared/src/types/form-template.ts. */
  @Column({ type: 'jsonb' })
  definition: FormTemplateDefinition;

  @Index()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
