import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FormCodeBadge } from './FormCodeBadge';
import { MentionBadge } from './MentionBadge';
import { EmptyState, ErrorState, LoadingState } from './StatusStates';
import { useFormSubmissions } from '../hooks/useApi';
import { headerText } from '../lib/header';
import { openSubmissionPdf } from '../lib/pdf';
import type { FormSubmissionFilters } from '../types/api';

/** Historique des inspections d'un établissement ou d'un inspecteur — fiches détaillées (PROMPT 6). */
export function InspectionHistoryList({ filters }: { filters: FormSubmissionFilters }) {
  const { data, isLoading, isError } = useFormSubmissions(filters);

  if (isLoading) return <LoadingState label="Chargement de l'historique…" />;
  if (isError) return <ErrorState message="Impossible de charger l'historique des inspections." />;
  if (!data || data.length === 0) return <EmptyState message="Aucune inspection enregistrée." />;

  return (
    <ul className="divide-y divide-brand-outline">
      {data.map((submission) => (
        <li key={submission.id} className="flex items-center gap-4 py-3 text-sm">
          <FormCodeBadge formCode={submission.formCode} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-800">
              {headerText(submission.header, 'enseignant') ??
                headerText(submission.header, 'inspecteur') ??
                submission.reportNumber}
            </div>
            <div className="truncate text-xs text-brand-muted">
              {submission.reportNumber} · {submission.schoolYear}
            </div>
          </div>
          <div className="hidden text-xs text-brand-muted sm:block">
            {format(new Date(submission.createdAt), 'd MMM yyyy', { locale: fr })}
          </div>
          <MentionBadge mention={submission.overallMention} />
          <button onClick={() => openSubmissionPdf(submission.id)} className="text-xs font-semibold text-brand-accent hover:underline">
            Voir
          </button>
        </li>
      ))}
    </ul>
  );
}
