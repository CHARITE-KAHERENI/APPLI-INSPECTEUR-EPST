import { FORM_CODES } from '@c3-digital/shared';
import type { FormCode } from '@c3-digital/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { DynamicFormWizard } from '../features/dynamic-form/DynamicFormWizard';
import { useEtablissement } from '../hooks/useApi';
import { formCodeLabel } from '../lib/formCode';
import { downloadSubmissionPdf, openSubmissionPdf } from '../lib/pdf';

function FormCodePicker({ onSelect }: { onSelect: (formCode: FormCode) => void }) {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Nouvelle inspection</h1>
      <p className="mb-6 text-sm text-brand-muted">Choisissez le formulaire à remplir.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FORM_CODES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onSelect(code)}
            className="rounded-2xl border border-brand-outline bg-brand-surface p-5 text-left transition hover:border-brand-primary hover:shadow-sm"
          >
            <span className="block text-sm font-semibold text-brand-primary">{code}</span>
            <span className="mt-1 block text-sm text-slate-700">{formCodeLabel(code).split(' — ')[1]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SubmissionSuccess({ submissionId, onNewInspection }: { submissionId: string; onNewInspection: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-positive/10 text-2xl text-brand-positive">
        ✓
      </div>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Inspection soumise</h1>
      <p className="mb-6 text-sm text-brand-muted">Le formulaire a été enregistré avec succès.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          onClick={() => openSubmissionPdf(submissionId)}
          className="rounded-lg border border-brand-outline bg-white px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-bg"
        >
          Voir le PDF
        </button>
        <button
          onClick={() => downloadSubmissionPdf(submissionId, `${submissionId}.pdf`)}
          className="rounded-lg border border-brand-outline bg-white px-4 py-2 text-sm font-semibold text-brand-primary transition hover:bg-brand-bg"
        >
          Télécharger le PDF
        </button>
        <button
          onClick={() => navigate('/inspections')}
          className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90"
        >
          Voir les inspections
        </button>
      </div>
      <button onClick={onNewInspection} className="mt-4 text-sm font-medium text-brand-muted hover:underline">
        Créer une autre inspection
      </button>
    </div>
  );
}

export function NewInspectionPage() {
  const { user } = useAuth();
  const [formCode, setFormCode] = useState<FormCode | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const { data: etablissement } = useEtablissement(user?.etablissementId ?? undefined);

  if (submittedId) {
    return (
      <SubmissionSuccess
        submissionId={submittedId}
        onNewInspection={() => {
          setSubmittedId(null);
          setFormCode(null);
        }}
      />
    );
  }

  if (!formCode) {
    return <FormCodePicker onSelect={setFormCode} />;
  }

  const initialHeader: Record<string, string | number | null> = {};
  if (user?.role === 'inspecteur') initialHeader.inspecteur = user.fullName;
  // "chef_etablissement" n'existe comme champ d'en-tête que sur C2 (voir shared/forms/c2.json) —
  // les autres formulaires utilisent "enseignant" à la place.
  if (user?.role === 'chef_etablissement' && formCode === 'C2') initialHeader.chef_etablissement = user.fullName;
  if (etablissement) initialHeader.etablissement = etablissement.nom;

  return (
    <DynamicFormWizard
      formCode={formCode}
      initialHeader={initialHeader}
      etablissementId={user?.etablissementId}
      inspecteurId={user?.inspecteurId}
      onSubmitted={setSubmittedId}
    />
  );
}
