import { CriterionResponse } from './types/form-submission';
import {
  ConversionTable,
  FormSectionTemplate,
} from './types/form-template';

/**
 * Logique de calcul partagée entre le backend, le web et (via le même
 * algorithme réimplémenté en Dart) le mobile : conversion des notes brutes
 * d'une section en pourcentage puis en mention, à partir du "Tableau de
 * conversion" unique défini au niveau du `FormTemplate`.
 */

export class UnknownCriterionError extends Error {
  constructor(criterionId: string, sectionId: string) {
    super(`Critère inconnu "${criterionId}" pour la section "${sectionId}".`);
    this.name = 'UnknownCriterionError';
  }
}

export class NoMatchingConversionRuleError extends Error {
  constructor(criteriaCount: number, rawScore: number) {
    super(
      `Aucune règle du tableau de conversion ne couvre la note ${rawScore} pour ${criteriaCount} critères. ` +
        'Vérifiez que conversionTable.rows contient une ligne pour ce nombre de critères et que ses plages couvrent 0-(4×N) sans trou.',
    );
    this.name = 'NoMatchingConversionRuleError';
  }
}

export interface ConversionResult {
  scoreOn4: 4 | 3 | 2 | 1 | 0;
  percentage: number;
  mention: string;
}

/**
 * Convertit une note brute en pourcentage + mention, via le "Tableau de
 * conversion" du formulaire.
 *
 * @param criteriaCount Nombre de critères concernés (N) — la longueur de
 *   `FormSectionTemplate.criteria`, ou `SynthesisTemplate.conversionCriteriaCount`
 *   pour la synthèse finale. Ignoré en mode `percentage_only`.
 */
export function convertRawScore(
  table: ConversionTable,
  rawScore: number,
  maxScore: number,
  criteriaCount?: number,
): ConversionResult {
  const percentage = maxScore === 0 ? 0 : Math.round((rawScore / maxScore) * 10000) / 100;

  if (table.mode === 'percentage_only') {
    const band = table.bands.find(
      (b) => percentage >= b.minPercentage && percentage <= b.maxPercentage,
    );
    if (!band) {
      throw new NoMatchingConversionRuleError(criteriaCount ?? 0, rawScore);
    }
    return { scoreOn4: band.scoreOn4, percentage, mention: band.mention };
  }

  if (criteriaCount === undefined) {
    throw new Error('criteriaCount est requis en mode lookup_by_criteria_count.');
  }
  const row = table.rows?.find((r) => r.criteriaCount === criteriaCount);
  if (!row) {
    throw new NoMatchingConversionRuleError(criteriaCount, rawScore);
  }
  const bandIndex = row.ranges.findIndex((r) => rawScore >= r.min && rawScore <= r.max);
  if (bandIndex === -1) {
    throw new NoMatchingConversionRuleError(criteriaCount, rawScore);
  }
  const band = table.bands[bandIndex];
  return { scoreOn4: band.scoreOn4, percentage, mention: band.mention };
}

export interface SectionScoreResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  mention: string;
  /** Note de la section convertie sur 4, réutilisable pour l'évaluation synthétique finale. */
  scoreOn4?: 4 | 3 | 2 | 1 | 0;
}

/**
 * Calcule le score total, le pourcentage et la mention d'une section à
 * partir des réponses aux critères et du tableau de conversion du template.
 */
export function computeSectionScore(
  section: FormSectionTemplate,
  responses: CriterionResponse[],
  conversionTable: ConversionTable,
): SectionScoreResult {
  const criteriaById = new Map(section.criteria.map((c) => [c.id, c]));

  let totalScore = 0;
  let maxScore = 0;

  for (const response of responses) {
    const criterion = criteriaById.get(response.criterionId);
    if (!criterion) {
      throw new UnknownCriterionError(response.criterionId, section.id);
    }
    const weight = criterion.weight ?? 1;
    totalScore += response.score * weight;
    maxScore += criterion.maxScore * weight;
  }

  const { percentage, mention, scoreOn4 } = convertRawScore(
    conversionTable,
    totalScore,
    maxScore,
    section.criteria.length,
  );

  return { totalScore, maxScore, percentage, mention, scoreOn4 };
}
