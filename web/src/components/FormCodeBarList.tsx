import { FORM_CODES } from '@c3-digital/shared';
import type { FormCodeStats } from '../types/api';
import { MentionBadge } from './MentionBadge';
import { formCodeLabel } from '../lib/formCode';
import { mentionForPercentage } from '../lib/mentions';

/**
 * Répartition des inspections par formulaire — une seule mesure (le
 * nombre d'inspections) éclatée par catégorie déjà identifiée par son
 * libellé de ligne : une seule teinte de marque suffit, la couleur n'a
 * pas besoin de coder l'identité de la catégorie (voir dataviz:
 * choosing-a-form / color-formula — un « single series » n'a pas besoin
 * de légende ni de palette catégorielle).
 */
export function FormCodeBarList({ data }: { data: FormCodeStats[] }) {
  const byCode = new Map(data.map((row) => [row.formCode, row]));
  const rows = FORM_CODES.map((formCode) => byCode.get(formCode) ?? { formCode, count: 0, averagePercentage: null });
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <div className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
      <h3 className="mb-1 text-sm font-semibold text-slate-800">Répartition par formulaire</h3>
      <p className="mb-5 text-xs text-brand-muted">Nombre d'inspections et score moyen, par type de formulaire.</p>

      <div className="space-y-3">
        {rows.map((row) => {
          const widthPct = (row.count / max) * 100;
          const mention = mentionForPercentage(row.averagePercentage);
          return (
            <div key={row.formCode} className="flex items-center gap-3">
              <div className="w-14 shrink-0 text-xs font-semibold text-slate-700" title={formCodeLabel(row.formCode)}>
                {row.formCode}
              </div>
              <div className="h-4 min-w-0 flex-1">
                <div
                  className="h-4 rounded-r-full bg-brand-accent transition-all"
                  style={{ width: row.count > 0 ? `${Math.max(widthPct, 4)}%` : '0%' }}
                />
              </div>
              <div className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                {row.count}
              </div>
              <div className="w-24 shrink-0 text-right text-xs tabular-nums text-brand-muted">
                {row.averagePercentage !== null ? `${row.averagePercentage.toFixed(0)}%` : '—'}
              </div>
              <div className="w-24 shrink-0 text-right">
                <MentionBadge mention={mention} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
