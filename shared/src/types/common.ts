/**
 * Types communs au modèle de "formulaire dynamique" c3-digital.
 *
 * Ce modèle sert de socle unique pour représenter les 5 formulaires
 * officiels de l'Inspection Générale de l'Enseignement (IGE) en RDC :
 *   - C2      : Inspection administrative
 *   - C3      : Inspection pédagogique (leçon théorique)
 *   - C3B     : Inspection pédagogique (leçon pratique)
 *   - C3M     : Rapport d'inspection du personnel de maîtrise/direction
 *   - C3_DAS  : Inspection pédagogique (séquence didactique)
 *
 * Le contenu détaillé (libellés exacts des rubriques, tableaux de
 * conversion officiels) peuple les fichiers de configuration JSON dans
 * `shared/forms/*.json`.
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
