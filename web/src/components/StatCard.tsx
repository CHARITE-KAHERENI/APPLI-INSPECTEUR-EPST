/**
 * Tuile de statistique (voir dataviz: marks-and-anatomy "Stat tile") :
 * libellé en petite casse, valeur en semi-gras avec chiffres
 * proportionnels (jamais `tabular-nums` sur un grand nombre isolé).
 */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-outline bg-brand-surface p-5">
      <div className="text-xs font-medium text-brand-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-brand-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-brand-muted">{hint}</div>}
    </div>
  );
}
