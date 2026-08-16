/**
 * Types communs au modèle de "formulaire dynamique" c3-digital.
 *
 * Ce modèle sert de socle unique pour représenter les 5 formulaires
 * officiels de l'Inspection Générale de l'Enseignement (IGE) en RDC :
 *   - C2      : Fiche d'inspection pédagogique (leçon observée)
 *   - C3      : Rapport d'inspection d'un enseignant
 *   - C3B     : Rapport d'inspection - variante B
 *   - C3M     : Rapport d'inspection du personnel de maîtrise/direction
 *   - C3_DAS  : Rapport d'inspection administrative et sociale
 *
 * Le contenu détaillé (libellés exacts des rubriques, barèmes officiels,
 * mentions) est fourni séparément et vient peupler les fichiers de
 * configuration JSON dans `shared/src/form-templates/*.json`.
 */

/** Les 5 formulaires officiels IGE pris en charge par la plateforme. */
export const FORM_CODES = ['C2', 'C3', 'C3B', 'C3M', 'C3_DAS'] as const;

export type FormCode = (typeof FORM_CODES)[number];

/** Une note de critère, sur l'échelle officielle 0 à 4. */
export type CriterionScore = 0 | 1 | 2 | 3 | 4;

export const MIN_CRITERION_SCORE = 0;
export const MAX_CRITERION_SCORE = 4;

/** Type de champ utilisable dans l'en-tête d'un formulaire. */
export type FormFieldType = 'text' | 'textarea' | 'date' | 'number' | 'select';

export interface FieldOption {
  value: string;
  label: string;
}

/** Rôle des trois signataires prévus par les formulaires IGE. */
export type SignatoryRole = 'enseignant' | 'chef_etablissement' | 'inspecteur';
