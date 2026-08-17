import { FORM_CODES } from '@c3-digital/shared';
import type { FormCode } from '@c3-digital/shared';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Requête de l'assistant de rédaction (PROMPT 8, point 1) — notes brutes
 * saisies par l'inspecteur sur une section notée, plus le contexte
 * nécessaire à une reformulation pertinente.
 */
export class WritingAssistantRequestDto {
  @IsIn(FORM_CODES)
  formCode: FormCode;

  @IsString()
  @MinLength(1)
  sectionTitle: string;

  @IsString()
  @MinLength(1)
  rawNotes: string;

  /**
   * Résumé (texte libre, construit côté client à partir de l'historique
   * de l'enseignant si disponible) — jamais une requête SQL/ID à
   * résoudre côté serveur, pour garder ce endpoint sans dépendance à une
   * fiche annuaire précise.
   */
  @IsOptional()
  @IsString()
  enseignantHistorySummary?: string;
}
