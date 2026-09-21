import type { FormCode } from '@c3-digital/shared';
import axios from 'axios';
import { useState } from 'react';
import { api } from '../../lib/api';
import { formCodeLabel } from '../../lib/formCode';
import { ErrorState, LoadingState } from '../../components/StatusStates';
import { IdentificationStep } from './IdentificationStep';
import { SectionStep } from './SectionStep';
import { SynthesisStep } from './SynthesisStep';
import { useDynamicForm } from './useDynamicForm';

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (Array.isArray(data?.message)) return data.message.join(' ');
    if (data?.message) return data.message;
  }
  return "La création de l'inspection a échoué. Réessayez.";
}

export function DynamicFormWizard({
  formCode,
  initialHeader,
  etablissementId,
  inspecteurId,
  onSubmitted,
}: {
  formCode: FormCode;
  initialHeader?: Record<string, string | number | null>;
  etablissementId?: string | null;
  inspecteurId?: string | null;
  onSubmitted: (submissionId: string) => void;
}) {
  const form = useDynamicForm(formCode);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  if (form.template && initialHeader && !prefilled) {
    for (const [key, value] of Object.entries(initialHeader)) {
      if (value !== null && value !== undefined && form.header[key] === undefined) {
        form.updateHeaderField(key, value);
      }
    }
    setPrefilled(true);
  }

  if (form.isLoading) return <LoadingState label="Chargement du formulaire…" />;
  if (form.isError || !form.template) {
    return <ErrorState message="Impossible de charger le modèle de formulaire." />;
  }

  const { template } = form;

  async function handleSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const { data: created } = await api.post<{ id: string }>('/form-submissions', {
        templateId: template!.id,
        formCode,
        reportNumber: String(form.header.numero_rapport ?? form.header.reportNumber ?? ''),
        schoolYear: String(form.header.annee_scolaire ?? form.header.schoolYear ?? ''),
        header: form.header,
        sections: form.buildSectionResponses(),
        signatures: form.buildSignatureResponses(),
        etablissementId: etablissementId ?? undefined,
        inspecteurId: inspecteurId ?? undefined,
      });
      await api.patch(`/form-submissions/${created.id}/status`, { status: 'soumis' });
      onSubmitted(created.id);
    } catch (error) {
      setSubmitError(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const progress = ((form.stepIndex + 1) / form.totalSteps) * 100;

  return (
    // `pb-24` : dégage la zone occupée par le widget flottant du chatbot
    // (bas-droite, position fixe sur toutes les pages — voir `ChatbotWidget`),
    // qui peut sinon chevaucher les boutons Précédent/Suivant sur une étape courte.
    <div className="pb-24">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{formCodeLabel(formCode)}</h1>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-brand-outline">
          <div className="h-full rounded-full bg-brand-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-brand-muted">
          Étape {form.stepIndex + 1} sur {form.totalSteps}
        </p>
      </header>

      <div className="rounded-2xl border border-brand-outline bg-white p-6">
        {form.currentStep === 'identification' && (
          <IdentificationStep template={template} header={form.header} onChange={form.updateHeaderField} />
        )}

        {form.currentStep === 'section' && form.currentSection && (
          <SectionStep
            section={form.currentSection}
            draft={form.sections[form.currentSection.id]}
            score={form.scoreForSection(form.currentSection)}
            onScoreChange={(criterionId, score) =>
              form.setCriterionScore(form.currentSection!.id, criterionId, score)
            }
            onCommentChange={(criterionId, comment) =>
              form.setCriterionComment(form.currentSection!.id, criterionId, comment)
            }
            onAdviceChange={(advice) => form.setSectionAdvice(form.currentSection!.id, advice)}
          />
        )}

        {form.currentStep === 'synthesis' && (
          <SynthesisStep
            template={template}
            allSectionScores={form.allSectionScores}
            overallScore={form.overallScore}
            signatures={form.signatures}
            onSigned={form.setSignature}
            onCleared={form.clearSignature}
            onPlaceChanged={form.setSignaturePlace}
            onSignedByNameChanged={form.setSignatureName}
          />
        )}
      </div>

      {submitError && (
        <p className="mt-4 rounded-lg bg-brand-danger/10 px-3 py-2 text-sm text-brand-danger">{submitError}</p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={form.previousStep}
          disabled={!form.canGoPrevious}
          className="rounded-lg border border-brand-outline bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-bg disabled:opacity-40"
        >
          Précédent
        </button>

        {form.canGoNext ? (
          <button
            type="button"
            onClick={form.nextStep}
            className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary/90"
          >
            Suivant
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-brand-positive px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-positive/90 disabled:opacity-60"
          >
            {isSubmitting ? 'Envoi…' : "Soumettre l'inspection"}
          </button>
        )}
      </div>
    </div>
  );
}
