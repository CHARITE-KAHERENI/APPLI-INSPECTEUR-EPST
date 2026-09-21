import type {
  FormCode,
  FormHeaderValues,
  FormSubmissionStatus,
  SectionResponse,
  SignatureResponse,
} from '@c3-digital/shared';

/**
 * Observation ajoutée librement par l'inspecteur sur mobile, distincte des
 * critères officiels (voir `CustomObservationDraft` côté Flutter et
 * `+ Ajouter une observation personnalisée` sur `DynamicFormScreen`).
 *
 * Transmise par `sync_payload_builder.dart` comme extension du JSONB
 * `sections` — non déclarée dans `SectionResponse` (shared) pour ne pas
 * mélanger le modèle officiel IGE avec cet ajout propre au mobile, donc
 * lue ici de façon défensive plutôt que strictement typée de bout en bout.
 */
export interface PdfCustomObservation {
  id?: string;
  label?: string;
  note?: string;
}

/** `SectionResponse` étendue de l'extension mobile ci-dessus. */
export interface PdfSectionResponse extends SectionResponse {
  customObservations?: PdfCustomObservation[];
}

/**
 * Ce que `PdfTemplateService` a besoin de connaître d'un formulaire rempli
 * pour en générer le PDF — un sous-ensemble de `FormSubmission` (shared),
 * volontairement découplé de `FormSubmissionEntity` pour que le même
 * moteur de rendu serve aussi bien une soumission réelle (base de
 * données) qu'un jeu de données fictif (script de test, voir
 * `scripts/generate-sample-c3-pdf.ts`).
 */
export interface PdfSubmissionInput {
  formCode: FormCode;
  reportNumber: string;
  schoolYear: string;
  header: FormHeaderValues;
  sections: PdfSectionResponse[];
  signatures: SignatureResponse[];
  status: FormSubmissionStatus;
  /** Horodatage affiché en pied de page ("Document généré le ..."). */
  generatedAt?: string;
}
