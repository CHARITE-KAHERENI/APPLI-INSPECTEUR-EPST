import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FormCodeBadge } from '../components/FormCodeBadge';
import { FormCodeBarList } from '../components/FormCodeBarList';
import { MentionBadge } from '../components/MentionBadge';
import { StatCard } from '../components/StatCard';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import { useAuth } from '../auth/useAuth';
import { useDashboardStats } from '../hooks/useApi';
import { headerText } from '../lib/header';
import { openSubmissionPdf } from '../lib/pdf';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useDashboardStats();

  const overallAverage =
    data && data.byFormCode.length > 0
      ? data.byFormCode.reduce((sum, row) => sum + (row.averagePercentage ?? 0) * row.count, 0) /
        Math.max(
          1,
          data.byFormCode.reduce((sum, row) => sum + (row.count > 0 && row.averagePercentage !== null ? row.count : 0), 0),
        )
      : null;

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="mt-1 text-sm text-brand-muted">
          {user?.zone
            ? `Vue d'ensemble des inspections — zone ${user.zone}.`
            : "Vue d'ensemble des inspections."}
        </p>
      </header>

      {isLoading && <LoadingState label="Chargement du tableau de bord…" />}
      {isError && <ErrorState message="Impossible de charger les statistiques." />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total des inspections" value={String(data.totalInspections)} />
            <StatCard
              label="Score moyen (toutes formulaires)"
              value={overallAverage !== null ? `${overallAverage.toFixed(0)}%` : '—'}
            />
            <StatCard label="Établissements actifs" value={String(data.activeEtablissements)} />
          </div>

          <FormCodeBarList data={data.byFormCode} />

          <div className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">Dernières inspections</h3>
            {data.latest.length === 0 ? (
              <EmptyState message="Aucune inspection pour l'instant." />
            ) : (
              <ul className="divide-y divide-brand-outline">
                {data.latest.map((submission) => (
                  <li key={submission.id} className="flex items-center gap-4 py-3 text-sm">
                    <FormCodeBadge formCode={submission.formCode} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800">
                        {headerText(submission.header, 'etablissement') ?? submission.reportNumber}
                      </div>
                      <div className="truncate text-xs text-brand-muted">
                        {headerText(submission.header, 'enseignant') ?? submission.reportNumber}
                        {' · '}
                        {submission.schoolYear}
                      </div>
                    </div>
                    <div className="hidden text-xs text-brand-muted sm:block">
                      {format(new Date(submission.createdAt), 'd MMM yyyy', { locale: fr })}
                    </div>
                    <MentionBadge mention={submission.overallMention} />
                    <button
                      onClick={() => openSubmissionPdf(submission.id)}
                      className="text-xs font-semibold text-brand-accent hover:underline"
                    >
                      Voir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
