import type { CriterionScore, SignatoryRole } from '@c3-digital/shared';

export interface CriterionDraft {
  score: CriterionScore | null;
  comment?: string;
}

export interface SectionDraft {
  criteria: Record<string, CriterionDraft>;
  advice: string;
}

export interface SignatureDraft {
  signedByName: string;
  place: string;
  /** PNG encodé en base64, sans préfixe `data:` — voir `SignaturePad`. */
  signatureImageBase64: string | null;
}

export type SignatureDraftMap = Record<SignatoryRole, SignatureDraft>;
