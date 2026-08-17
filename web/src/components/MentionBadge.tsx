/**
 * Couleur par mention — mêmes 5 mentions officielles (ELITE / TRES BON /
 * BON / ASSEZ BON / MEDIOCRE) sur les 5 formulaires, voir
 * `shared/forms/*.json` `conversionTable.bands[].mention`. Palette
 * identique à `AppColors.scoreScale` (mobile) / `SCORE_COLORS` (PDF backend).
 */
const MENTION_STYLES: Record<string, string> = {
  ELITE: 'bg-brand-positive/10 text-brand-positive',
  'TRES BON': 'bg-brand-primary/10 text-brand-primary',
  BON: 'bg-brand-accent/10 text-brand-accent',
  'ASSEZ BON': 'bg-brand-warning/10 text-brand-warning',
  MEDIOCRE: 'bg-brand-danger/10 text-brand-danger',
};

export function MentionBadge({ mention }: { mention: string | null | undefined }) {
  if (!mention) {
    return <span className="text-xs text-brand-muted">—</span>;
  }
  const style = MENTION_STYLES[mention] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      {mention}
    </span>
  );
}
