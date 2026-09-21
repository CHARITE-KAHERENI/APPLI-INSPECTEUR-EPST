import type {
  CriterionResponse,
  CriterionScore,
  FormCode,
  FormHeaderValues,
  FormSectionTemplate,
  FormTemplate,
  SectionResponse,
  SignatoryRole,
  SignatureResponse,
} from '@c3-digital/shared';
import { computeSectionScore, computeSynthesisScore } from '@c3-digital/shared';
import type { ConversionResult, SectionScoreResult } from '@c3-digital/shared';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { ApiFormTemplate } from '../../types/api';
import type { CriterionDraft, SectionDraft, SignatureDraftMap } from './types';

/** Étape courante de l'assistant de saisie — même modèle à 3 phases que le mobile (`DynamicFormStep`). */
export type DynamicFormStep = 'identification' | 'section' | 'synthesis';

export function useDynamicForm(formCode: FormCode) {
  const templateQuery = useQuery({
    queryKey: ['form-templates', formCode],
    queryFn: async (): Promise<FormTemplate> => {
      const { data } = await api.get<ApiFormTemplate>(`/form-templates/${formCode}`);
      // Aplatit la réponse de l'API (`definition` en JSONB) en `FormTemplate` —
      // voir `ApiFormTemplate`.
      return {
        id: data.id,
        code: data.code,
        name: data.name,
        version: data.version,
        description: data.description ?? undefined,
        isActive: data.isActive,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        ...data.definition,
      };
    },
  });
  const template = templateQuery.data;

  const [header, setHeader] = useState<FormHeaderValues>({});
  const [sections, setSections] = useState<Record<string, SectionDraft>>({});
  const [signatures, setSignatures] = useState<SignatureDraftMap>({} as SignatureDraftMap);
  const [stepIndex, setStepIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Initialise les brouillons de section/signature une fois le template chargé
  // (une seule fois : on ne veut pas écraser la saisie en cours si le composant se re-render).
  useEffect(() => {
    if (!template || initialized) return;
    setSections(
      Object.fromEntries(template.sections.map((section) => [section.id, { criteria: {}, advice: '' }])),
    );
    setSignatures(
      Object.fromEntries(
        template.signatures.roles.map((role) => [
          role.role,
          { signedByName: '', place: '', signatureImageBase64: null },
        ]),
      ) as SignatureDraftMap,
    );
    setInitialized(true);
  }, [template, initialized]);

  const totalSteps = template ? template.sections.length + 2 : 0;

  const currentStep: DynamicFormStep = useMemo(() => {
    if (stepIndex === 0) return 'identification';
    if (stepIndex === totalSteps - 1) return 'synthesis';
    return 'section';
  }, [stepIndex, totalSteps]);

  const currentSection: FormSectionTemplate | null =
    template && currentStep === 'section' ? template.sections[stepIndex - 1] : null;

  function goToStep(index: number) {
    if (index < 0 || index >= totalSteps) return;
    setStepIndex(index);
  }

  function updateHeaderField(key: string, value: string | number | null) {
    setHeader((prev) => ({ ...prev, [key]: value }));
  }

  function setCriterionScore(sectionId: string, criterionId: string, score: CriterionScore) {
    setSections((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        criteria: {
          ...prev[sectionId]?.criteria,
          [criterionId]: { ...prev[sectionId]?.criteria[criterionId], score },
        },
      },
    }));
  }

  function setCriterionComment(sectionId: string, criterionId: string, comment: string) {
    setSections((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        criteria: {
          ...prev[sectionId]?.criteria,
          [criterionId]: { ...prev[sectionId]?.criteria[criterionId], comment },
        },
      },
    }));
  }

  function setSectionAdvice(sectionId: string, advice: string) {
    setSections((prev) => ({ ...prev, [sectionId]: { ...prev[sectionId], advice } }));
  }

  function setSignature(role: SignatoryRole, signatureImageBase64: string) {
    setSignatures((prev) => ({ ...prev, [role]: { ...prev[role], signatureImageBase64 } }));
  }

  function clearSignature(role: SignatoryRole) {
    setSignatures((prev) => ({ ...prev, [role]: { ...prev[role], signatureImageBase64: null } }));
  }

  function setSignatureName(role: SignatoryRole, signedByName: string) {
    setSignatures((prev) => ({ ...prev, [role]: { ...prev[role], signedByName } }));
  }

  function setSignaturePlace(role: SignatoryRole, place: string) {
    setSignatures((prev) => ({ ...prev, [role]: { ...prev[role], place } }));
  }

  /** Réponses non vides d'une section — seuls les critères déjà notés comptent, comme côté mobile. */
  function responsesForSection(section: FormSectionTemplate): CriterionResponse[] {
    const draft = sections[section.id];
    if (!draft) return [];
    const responses: CriterionResponse[] = [];
    for (const criterion of section.criteria) {
      const criterionDraft: CriterionDraft | undefined = draft.criteria[criterion.id];
      if (criterionDraft?.score === undefined || criterionDraft.score === null) continue;
      responses.push({ criterionId: criterion.id, score: criterionDraft.score, comment: criterionDraft.comment });
    }
    return responses;
  }

  function scoreForSection(section: FormSectionTemplate): SectionScoreResult | null {
    if (!template) return null;
    return computeSectionScore(section, responsesForSection(section), template.conversionTable);
  }

  const allSectionScores: Record<string, SectionScoreResult> = useMemo(() => {
    if (!template) return {};
    return Object.fromEntries(template.sections.map((section) => [section.id, scoreForSection(section)!]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, sections]);

  const overallScore: ConversionResult | null = useMemo(() => {
    if (!template) return null;
    return computeSynthesisScore(template, allSectionScores);
  }, [template, allSectionScores]);

  function buildSectionResponses(): SectionResponse[] {
    if (!template) return [];
    return template.sections.map((section) => {
      const result = scoreForSection(section)!;
      const draft = sections[section.id];
      return {
        sectionId: section.id,
        criteria: responsesForSection(section),
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        percentage: result.percentage,
        mention: result.mention,
        advice: draft?.advice || undefined,
      };
    });
  }

  function buildSignatureResponses(): SignatureResponse[] {
    if (!template) return [];
    return template.signatures.roles.map(({ role }) => {
      const draft = signatures[role];
      return {
        role,
        signedByName: draft?.signedByName || undefined,
        place: draft?.place || undefined,
        signatureImageBase64: draft?.signatureImageBase64 ?? undefined,
        signedAt: draft?.signatureImageBase64 ? new Date().toISOString() : undefined,
      };
    });
  }

  return {
    template,
    isLoading: templateQuery.isLoading,
    isError: templateQuery.isError,
    header,
    sections,
    signatures,
    stepIndex,
    totalSteps,
    currentStep,
    currentSection,
    canGoNext: stepIndex < totalSteps - 1,
    canGoPrevious: stepIndex > 0,
    goToStep,
    nextStep: () => goToStep(stepIndex + 1),
    previousStep: () => goToStep(stepIndex - 1),
    updateHeaderField,
    setCriterionScore,
    setCriterionComment,
    setSectionAdvice,
    setSignature,
    clearSignature,
    setSignatureName,
    setSignaturePlace,
    scoreForSection,
    allSectionScores,
    overallScore,
    buildSectionResponses,
    buildSignatureResponses,
  };
}

export type UseDynamicFormReturn = ReturnType<typeof useDynamicForm>;
