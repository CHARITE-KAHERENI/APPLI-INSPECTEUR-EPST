import { FORM_CODES } from '@c3-digital/shared';
import type { FormCode } from '@c3-digital/shared';
import { useState } from 'react';
import { ErrorState } from '../components/StatusStates';
import { useWritingAssistant } from '../hooks/useApi';
import { formCodeLabel } from '../lib/formCode';

/**
 * Assistant de rédaction (PROMPT 8, point 1), version web. Le web n'a pas
 * (encore) d'écran de saisie de formulaire — voir README, "Prochaines
 * étapes" — cette page expose donc la même capacité que celle intégrée
 * au formulaire mobile (voir `SectionStep`), comme un outil autonome :
 * l'inspecteur colle ses notes brutes, obtient une reformulation, et la
 * copie dans son rapport. Nécessite une connexion internet (appel direct
 * à l'API Claude) — un message clair s'affiche en cas d'indisponibilité,
 * sans bloquer l'utilisateur (il peut continuer sans IA).
 */
export function AssistantIaPage() {
  const [formCode, setFormCode] = useState<FormCode>('C3');
  const [sectionTitle, setSectionTitle] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [enseignantHistorySummary, setEnseignantHistorySummary] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [copied, setCopied] = useState(false);

  const mutation = useWritingAssistant();

  function generate() {
    setCopied(false);
    mutation.mutate(
      {
        formCode,
        sectionTitle: sectionTitle.trim() || 'Section notée',
        rawNotes,
        enseignantHistorySummary: enseignantHistorySummary.trim() || undefined,
      },
      { onSuccess: (data) => setSuggestion(data.suggestion) },
    );
  }

  function copySuggestion() {
    void navigator.clipboard.writeText(suggestion).then(() => setCopied(true));
  }

  const isUnavailable = mutation.isError;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Assistant de rédaction IA</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Collez vos notes brutes prises sur le terrain : l'IA les reformule en un conseil pédagogique structuré,
          que vous pouvez accepter, modifier ou régénérer.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-brand-outline bg-brand-surface p-6">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-brand-muted">Formulaire</span>
            <select
              value={formCode}
              onChange={(event) => setFormCode(event.target.value as FormCode)}
              className="rounded-lg border border-brand-outline bg-white px-2 py-1.5 text-sm"
            >
              {FORM_CODES.map((code) => (
                <option key={code} value={code}>
                  {code} — {formCodeLabel(code)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-brand-muted">Section notée</span>
            <input
              type="text"
              value={sectionTitle}
              onChange={(event) => setSectionTitle(event.target.value)}
              placeholder="ex : Préparation de la leçon"
              className="rounded-lg border border-brand-outline px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-brand-muted">Historique de l'enseignant (optionnel)</span>
            <input
              type="text"
              value={enseignantHistorySummary}
              onChange={(event) => setEnseignantHistorySummary(event.target.value)}
              placeholder="ex : Déjà inspecté 2 fois cette année, progression constante"
              className="rounded-lg border border-brand-outline px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-brand-muted">Notes brutes</span>
            <textarea
              value={rawNotes}
              onChange={(event) => setRawNotes(event.target.value)}
              rows={6}
              placeholder="Notes prises sur le terrain, style télégraphique accepté…"
              className="rounded-lg border border-brand-outline px-3 py-2 text-sm"
            />
          </label>

          <button
            onClick={generate}
            disabled={mutation.isPending || rawNotes.trim().length === 0}
            className="w-full rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending
              ? 'Génération…'
              : suggestion
                ? 'Régénérer la suggestion'
                : 'Suggestion IA'}
          </button>
        </div>

        <div className="rounded-2xl border border-brand-outline bg-brand-surface p-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Conseil pédagogique suggéré</h3>

          {isUnavailable && (
            <ErrorState message="Fonction IA indisponible pour le moment (vérifiez la connexion ou réessayez plus tard). Vous pouvez continuer à rédiger sans IA." />
          )}

          {!isUnavailable && !suggestion && !mutation.isPending && (
            <p className="text-sm text-brand-muted">
              La suggestion apparaîtra ici après avoir cliqué sur "Suggestion IA".
            </p>
          )}

          {mutation.isPending && <p className="text-sm text-brand-muted">Génération en cours…</p>}

          {suggestion && !mutation.isPending && (
            <div className="space-y-3">
              <textarea
                value={suggestion}
                onChange={(event) => setSuggestion(event.target.value)}
                rows={10}
                className="w-full rounded-lg border border-brand-outline px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={copySuggestion}
                  className="rounded-lg border border-brand-outline bg-white px-3 py-2 text-xs font-semibold text-brand-primary transition hover:bg-brand-bg"
                >
                  {copied ? 'Copié ✓' : 'Copier'}
                </button>
                <button
                  onClick={generate}
                  disabled={mutation.isPending}
                  className="rounded-lg border border-brand-outline bg-white px-3 py-2 text-xs font-semibold text-brand-primary transition hover:bg-brand-bg"
                >
                  Régénérer
                </button>
              </div>
              <p className="text-xs text-brand-muted">
                Vous pouvez modifier le texte ci-dessus avant de le reporter dans votre rapport — il n'est jamais
                enregistré automatiquement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
