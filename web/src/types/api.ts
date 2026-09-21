import type {
  ConversionTable,
  FormCode,
  FormFieldGroup,
  FormHeaderTemplate,
  FormHeaderValues,
  FormSectionTemplate,
  FormSubmissionStatus,
  SectionResponse,
  SignatureResponse,
  SignatureZoneTemplate,
  SynthesisTemplate,
} from '@c3-digital/shared';

/**
 * Ce que renvoie vraiment `GET /form-templates/:code` : la table
 * `form_templates` (backend) stocke le contenu détaillé (en-tête,
 * sections, barème...) dans une seule colonne JSONB `definition` — voir
 * `backend/src/modules/form-templates/entities/form-template.entity.ts`.
 * `useDynamicForm` aplatit cette réponse en `FormTemplate` (shared), de la
 * même façon que `PdfController` le fait déjà côté backend.
 */
export interface ApiFormTemplate {
  id: string;
  code: FormCode;
  name: string;
  version: string;
  description: string | null;
  definition: {
    header: FormHeaderTemplate;
    fieldGroups: FormFieldGroup[];
    sections: FormSectionTemplate[];
    conversionTable: ConversionTable;
    synthesis: SynthesisTemplate;
    signatures: SignatureZoneTemplate;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Formulaire rempli tel que renvoyé par l'API (`GET /form-submissions*`) —
 * proche de `FormSubmission` (shared) mais reflète fidèlement la forme
 * réelle de la réponse JSON : horodatages en chaînes ISO, colonne
 * `numeric` Postgres sérialisée en chaîne par TypeORM
 * (`overallPercentage`), et les nouveaux liens vers l'annuaire.
 */
export interface ApiFormSubmission {
  id: string;
  templateId: string;
  formCode: FormCode;
  reportNumber: string;
  schoolYear: string;
  header: FormHeaderValues;
  sections: SectionResponse[];
  signatures: SignatureResponse[];
  status: FormSubmissionStatus;
  createdBy: string | null;
  deviceId: string | null;
  submittedAt: string | null;
  syncedAt: string | null;
  etablissementId: string | null;
  enseignantId: string | null;
  inspecteurId: string | null;
  /** Score de synthèse final (0-100), chaîne car colonne `numeric` — voir `overall-score.util.ts` (backend). */
  overallPercentage: string | null;
  overallMention: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormCodeStats {
  formCode: FormCode;
  count: number;
  averagePercentage: number | null;
}

/** Réponse de `GET /form-submissions/stats` — alimente le tableau de bord IGE. */
export interface DashboardStats {
  totalInspections: number;
  byFormCode: FormCodeStats[];
  activeEtablissements: number;
  latest: ApiFormSubmission[];
}

export interface FormSubmissionFilters {
  formCode?: FormCode;
  etablissementId?: string;
  inspecteurId?: string;
  status?: FormSubmissionStatus;
  schoolYear?: string;
  dateFrom?: string;
  dateTo?: string;
}
