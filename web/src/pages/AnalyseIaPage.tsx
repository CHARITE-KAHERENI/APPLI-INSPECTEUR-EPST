import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../auth/useAuth';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import { useGenerateTrendAnalysis, useLatestTrendAnalysis } from '../hooks/useApi';

/**
 * Analyse des tendances par IA (PROMPT 8, point 2) — IGE uniquement.
 * Affiche la dernière synthèse générée par le job quotidien
 * (`TrendAnalysisSchedulerService`), avec une distinction visuelle claire
 * entre alertes, tendances et points positifs (couleurs danger/accent/
 * positive, cohérentes avec le reste de l'identité visuelle).
 */
export function AnalyseIaPage() {
  const { user } = useAuth();
  const { data: analysis, isLoading, isError } = useLatestTrendAnalysis();
  const generate = useGenerateTrendAnalysis();

  if (user && user.role !== 'ige_admin' && user.role !== 'super_admin') {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">Analyse IA</h1>
        <ErrorState message="Cette page est réservée à l'IGE." />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyse IA</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Synthèse quotidienne des tendances (scores par zone, établissement et formulaire).
          </p>
        </div>
        {user?.role === 'super_admin' && (
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="rounded-lg border border-brand-outline bg-white px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-bg disabled:opacity-50"
          >
            {generate.isPending ? 'Génération…' : 'Générer maintenant'}
          </button>
        )}
      </header>

      {isLoading && <LoadingState label="Chargement de l'analyse…" />}
      {isError && <ErrorState message="Impossible de charger l'analyse des tendances." />}
      {generate.isError && (
        <div className="mb-4">
          <ErrorState message="Impossible de générer une nouvelle analyse (fonctionnalité IA indisponible ?)." />
        </div>
      )}

      {!isLoading && !analysis && (
        <EmptyState message="Aucune analyse générée pour l'instant — le job quotidien s'exécute automatiquement, ou déclenchez-en une manuellement." />
      )}

      {analysis && (
        <div className="space-y-6">
          <p className="text-xs text-brand-muted">
            {analysis.periodLabel} — générée le{' '}
            {format(new Date(analysis.generatedAt), 'd MMMM yyyy à HH:mm', { locale: fr })}
          </p>

          <TrendSection title="Alertes" tone="danger" items={analysis.alerts} emptyLabel="Aucune alerte." />
          <TrendSection title="Tendances" tone="accent" items={analysis.trends} emptyLabel="Aucune tendance notable." />
          <TrendSection
            title="Points positifs"
            tone="positive"
            items={analysis.positives}
            emptyLabel="Aucun point positif signalé."
          />
        </div>
      )}
    </div>
  );
}

const TONE_STYLES = {
  danger: { border: 'border-brand-danger/30', bg: 'bg-brand-danger/5', dot: 'bg-brand-danger', text: 'text-brand-danger' },
  accent: { border: 'border-brand-accent/30', bg: 'bg-brand-accent/5', dot: 'bg-brand-accent', text: 'text-brand-accent' },
  positive: {
    border: 'border-brand-positive/30',
    bg: 'bg-brand-positive/5',
    dot: 'bg-brand-positive',
    text: 'text-brand-positive',
  },
} as const;

function TrendSection({
  title,
  tone,
  items,
  emptyLabel,
}: {
  title: string;
  tone: keyof typeof TONE_STYLES;
  items: string[];
  emptyLabel: string;
}) {
  const style = TONE_STYLES[tone];
  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} p-6`}>
      <h3 className={`mb-3 text-sm font-semibold ${style.text}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-brand-muted">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
