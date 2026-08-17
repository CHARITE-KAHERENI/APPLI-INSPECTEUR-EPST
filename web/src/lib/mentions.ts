/**
 * Bandes de mention (note-sur-4 / %) — identiques sur les 5 formulaires
 * officiels au moment de la rédaction (voir `conversionTable.bands` de
 * chaque `shared/forms/*.json`). Utilisé uniquement pour dériver un badge
 * de mention *indicatif* à partir d'un pourcentage moyen agrégé (tableau
 * de bord) — jamais comme substitut au calcul officiel par formulaire
 * (voir `shared/src/scoring.ts#computeSynthesisScore`, seule source de
 * vérité pour la mention d'un formulaire donné).
 */
const MENTION_BANDS: Array<{ min: number; mention: string }> = [
  { min: 80, mention: 'ELITE' },
  { min: 70, mention: 'TRES BON' },
  { min: 50, mention: 'BON' },
  { min: 40, mention: 'ASSEZ BON' },
  { min: 0, mention: 'MEDIOCRE' },
];

export function mentionForPercentage(percentage: number | null): string | null {
  if (percentage === null || Number.isNaN(percentage)) {
    return null;
  }
  const band = MENTION_BANDS.find((b) => percentage >= b.min);
  return band?.mention ?? null;
}
