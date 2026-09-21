import type { FormTemplate, SectionResponse } from '@c3-digital/shared';
import { computeSynthesisScore, SectionScoreResult } from '@c3-digital/shared';

export interface OverallScoreResult {
  percentage: number | null;
  mention: string | null;
}

/**
 * Calcule le score de synthèse final d'un formulaire rempli à partir de
 * ses sections déjà notées et de la définition du template utilisé — même
 * algorithme que le calcul en temps réel du mobile et le PDF généré (voir
 * `shared/src/scoring.ts#computeSynthesisScore`).
 *
 * Le résultat est dénormalisé dans `form_submissions.overall_percentage` /
 * `.overall_mention` (voir la migration `AddOverallScoreToFormSubmissions`)
 * pour que les agrégations du tableau de bord IGE ("score moyen par
 * formulaire") n'aient pas à ré-appliquer le barème officiel en SQL.
 *
 * Renvoie `{ percentage: null, mention: null }` plutôt que de lever une
 * exception si le calcul échoue (ex : brouillon dont certaines sections
 * n'ont pas encore de note) — un score indisponible ne doit jamais
 * empêcher l'enregistrement d'un brouillon.
 */
export function computeOverallScore(
  template: Pick<FormTemplate, 'conversionTable' | 'synthesis'>,
  sections: SectionResponse[],
): OverallScoreResult {
  try {
    const sectionsById = new Map(
      sections.map((section) => [section.sectionId, section]),
    );
    const bandByMention = new Map(
      template.conversionTable.bands.map((band) => [band.mention, band]),
    );

    const sectionScores: Record<string, SectionScoreResult> = {};
    for (const row of template.synthesis.rows) {
      const response = sectionsById.get(row.sectionId);
      if (!response) {
        continue;
      }
      const band = bandByMention.get(response.mention);
      sectionScores[row.sectionId] = {
        totalScore: response.totalScore,
        maxScore: response.maxScore,
        percentage: response.percentage,
        mention: response.mention,
        scoreOn4: band?.scoreOn4,
      };
    }

    const result = computeSynthesisScore(template, sectionScores);
    return { percentage: result.percentage, mention: result.mention };
  } catch {
    return { percentage: null, mention: null };
  }
}
