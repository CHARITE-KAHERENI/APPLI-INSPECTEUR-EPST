import { FORM_CODES } from '@c3-digital/shared';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import { FormCodeBadge } from '../components/FormCodeBadge';
import { MentionBadge } from '../components/MentionBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/StatusStates';
import { useEtablissements, useFormSubmissions, useInspecteurs } from '../hooks/useApi';
import { downloadCsv } from '../lib/exportCsv';
import { headerText } from '../lib/header';
import { downloadSubmissionPdf, openSubmissionPdf } from '../lib/pdf';
import type { FormSubmissionFilters } from '../types/api';

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  synchronise: 'Synchronisé',
};

export function InspectionsPage() {
  const [filters, setFilters] = useState<FormSubmissionFilters>({});
  const { data: submissions, isLoading, isError } = useFormSubmissions(filters);
  const { data: etablissements } = useEtablissements();
  const { data: inspecteurs } = useInspecteurs();

  function updateFilter<K extends keyof FormSubmissionFilters>(key: K, value: FormSubmissionFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  }

  function exportCsv() {
    if (!submissions) return;
    downloadCsv(
      `inspections-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Formulaire', 'Établissement', 'Enseignant', 'Inspecteur', 'Année scolaire', 'Date', 'Statut', 'Mention', 'Score (%)'],
      submissions.map((submission) => [
        submission.formCode,
        headerText(submission.header, 'etablissement') ?? '',
        headerText(submission.header, 'enseignant') ?? '',
        headerText(submission.header, 'inspecteur') ?? '',
        submission.schoolYear,
        format(new Date(submission.createdAt), 'dd/MM/yyyy'),
        STATUS_LABELS[submission.status] ?? submission.status,
        submission.overallMention ?? '',
        submission.overallPercentage ?? '',
      ]),
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inspections</h1>
          <p className="mt-1 text-sm text-brand-muted">
            {submissions ? `${submissions.length} inspection(s)` : 'Liste des formulaires remplis.'}
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={!submissions || submissions.length === 0}
          className="rounded-lg border border-brand-outline bg-white px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-bg disabled:opacity-50"
        >
          Exporter (Excel/CSV)
        </button>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl border border-brand-outline bg-brand-surface p-4 sm:grid-cols-3 lg:grid-cols-6">
        <FilterSelect
          label="Formulaire"
          value={filters.formCode ?? ''}
          onChange={(value) => updateFilter('formCode', value as FormSubmissionFilters['formCode'])}
          options={FORM_CODES.map((code) => ({ value: code, label: code }))}
        />
        <FilterSelect
          label="Établissement"
          value={filters.etablissementId ?? ''}
          onChange={(value) => updateFilter('etablissementId', value)}
          options={(etablissements ?? []).map((e) => ({ value: e.id, label: e.nom }))}
        />
        <FilterSelect
          label="Inspecteur"
          value={filters.inspecteurId ?? ''}
          onChange={(value) => updateFilter('inspecteurId', value)}
          options={(inspecteurs ?? []).map((i) => ({ value: i.id, label: i.nom }))}
        />
        <FilterSelect
          label="Statut"
          value={filters.status ?? ''}
          onChange={(value) => updateFilter('status', value as FormSubmissionFilters['status'])}
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-brand-muted">Depuis</span>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(event) => updateFilter('dateFrom', event.target.value)}
            className="rounded-lg border border-brand-outline px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-brand-muted">Jusqu'au</span>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(event) => updateFilter('dateTo', event.target.value)}
            className="rounded-lg border border-brand-outline px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {isLoading && <LoadingState label="Chargement des inspections…" />}
      {isError && <ErrorState message="Impossible de charger les inspections." />}
      {submissions && submissions.length === 0 && (
        <EmptyState message="Aucune inspection ne correspond à ces filtres." />
      )}

      {submissions && submissions.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-brand-outline bg-brand-surface">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-outline text-xs font-medium uppercase tracking-wide text-brand-muted">
                <th className="px-4 py-3">Formulaire</th>
                <th className="px-4 py-3">Établissement</th>
                <th className="px-4 py-3">Enseignant</th>
                <th className="px-4 py-3">Inspecteur</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Mention</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-outline">
              {submissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-brand-bg/60">
                  <td className="px-4 py-3">
                    <FormCodeBadge formCode={submission.formCode} />
                  </td>
                  <td className="px-4 py-3">{headerText(submission.header, 'etablissement') ?? '—'}</td>
                  <td className="px-4 py-3">{headerText(submission.header, 'enseignant') ?? '—'}</td>
                  <td className="px-4 py-3">{headerText(submission.header, 'inspecteur') ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">
                    {format(new Date(submission.createdAt), 'd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{STATUS_LABELS[submission.status] ?? submission.status}</td>
                  <td className="px-4 py-3">
                    <MentionBadge mention={submission.overallMention} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs font-semibold">
                      <button
                        onClick={() => openSubmissionPdf(submission.id)}
                        className="text-brand-accent hover:underline"
                      >
                        Voir
                      </button>
                      <button
                        onClick={() =>
                          downloadSubmissionPdf(submission.id, `${submission.formCode}-${submission.reportNumber}.pdf`)
                        }
                        className="text-brand-primary hover:underline"
                      >
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-brand-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-brand-outline bg-white px-2 py-1.5 text-sm"
      >
        <option value="">Tous</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
