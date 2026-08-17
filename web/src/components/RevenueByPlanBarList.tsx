import type { SubscriptionAdminOverview } from '@c3-digital/shared';
import { formatFc } from '../lib/currency';

/**
 * Revenus par formule — même logique que `FormCodeBarList` (une seule
 * mesure, l'identité de catégorie déjà portée par le libellé de ligne :
 * une seule teinte de marque suffit, pas de palette catégorielle).
 */
export function RevenueByPlanBarList({ data }: { data: SubscriptionAdminOverview['revenueByPlan'] }) {
  const max = Math.max(1, ...data.map((row) => row.totalFc));

  return (
    <div className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
      <h3 className="mb-1 text-sm font-semibold text-slate-800">Revenus par formule</h3>
      <p className="mb-5 text-xs text-brand-muted">Total encaissé (paiements confirmés), par formule d'abonnement.</p>

      {data.length === 0 ? (
        <p className="text-sm text-brand-muted">Aucun paiement confirmé pour l'instant.</p>
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const widthPct = (row.totalFc / max) * 100;
            return (
              <div key={row.planCode} className="flex items-center gap-3">
                <div className="w-28 shrink-0 truncate text-xs font-semibold text-slate-700" title={row.planLabel}>
                  {row.planLabel}
                </div>
                <div className="h-4 min-w-0 flex-1">
                  <div
                    className="h-4 rounded-r-full bg-brand-accent transition-all"
                    style={{ width: row.totalFc > 0 ? `${Math.max(widthPct, 4)}%` : '0%' }}
                  />
                </div>
                <div className="w-28 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                  {formatFc(row.totalFc)}
                </div>
                <div className="w-24 shrink-0 text-right text-xs tabular-nums text-brand-muted">
                  {row.paymentsCount} paiement{row.paymentsCount > 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
