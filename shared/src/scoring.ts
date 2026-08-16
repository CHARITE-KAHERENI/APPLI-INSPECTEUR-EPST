import { CriterionResponse } from './types/form-submission';
import { FormSectionTemplate } from './types/form-template';

/**
 * Logique de calcul partagée entre le backend, le web et (via le même
 * algorithme réimplémenté en Dart) le mobile : conversion des notes brutes
 * d'une section en pourcentage puis en mention, à partir du barème défini
 * dans le `FormTemplate`.
 */

export class UnknownCriterionError extends Error {
  constructor(criterionId: string, sectionId: string) {
    super(`Critère inconnu "${criterionId}" pour la section "${sectionId}".`);
    this.name = 'UnknownCriterionError';
  }
}

export class NoMatchingMentionRuleError extends Error {
  constructor(percentage: number, sectionId: string) {
    super(
      `Aucune règle de barème ne couvre ${percentage}% pour la section "${sectionId}". ` +
        'Vérifiez que les mentionRules couvrent bien 0-100 sans trou.',
    );
    this.name = 'NoMatchingMentionRuleError';
  }
}

export interface SectionScoreResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  mention: string;
}

/**
 * Calcule le score total, le pourcentage et la mention d'une section à
 * partir des réponses aux critères et du template de la section.
 */
export function computeSectionScore(
  section: FormSectionTemplate,
  responses: CriterionResponse[],
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

  const percentage =
    section.bareme.conversionMethod === 'sum_to_percentage'
      ? maxScore === 0
        ? 0
        : (totalScore / maxScore) * 100
      : responses.length === 0
        ? 0
        : (totalScore / responses.length / section.bareme.maxScorePerCriterion) * 100;

  const roundedPercentage = Math.round(percentage * 100) / 100;
  const mention = resolveMention(section, roundedPercentage);

  return {
    totalScore,
    maxScore,
    percentage: roundedPercentage,
    mention,
  };
}

/** Trouve la mention correspondant à un pourcentage, selon le barème de la section. */
export function resolveMention(section: FormSectionTemplate, percentage: number): string {
  const rule = section.bareme.mentionRules.find(
    (r) => percentage >= r.minPercentage && percentage <= r.maxPercentage,
  );
  if (!rule) {
    throw new NoMatchingMentionRuleError(percentage, section.id);
  }
  return rule.mention;
}
