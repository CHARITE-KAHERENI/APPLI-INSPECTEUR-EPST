import { CriterionScore, FormCode, SignatoryRole } from './common';

/**
 * Statut de cycle de vie d'un formulaire rempli, en particulier pour
 * l'usage hors-ligne sur l'application mobile Flutter :
 *   - brouillon    : en cours de saisie, non finalisé
 *   - soumis       : finalisé et signé par les parties requises
 *   - synchronise  : transmis avec succès au backend et persisté côté serveur
 */
export type FormSubmissionStatus = 'brouillon' | 'soumis' | 'synchronise';

/** Valeurs saisies pour les champs de l'en-tête (clé du champ -> valeur). */
export type FormHeaderValues = Record<string, string | number | null>;

/** Réponse à un critère : la note donnée et un commentaire optionnel. */
export interface CriterionResponse {
  criterionId: string;
  score: CriterionScore;
  comment?: string;
}

/** Résultat calculé et réponses d'une section pour un formulaire rempli. */
export interface SectionResponse {
  sectionId: string;
  criteria: CriterionResponse[];
  /** Somme des notes obtenues sur la section. */
  totalScore: number;
  /** Somme des notes maximales possibles sur la section. */
  maxScore: number;
  /** Pourcentage calculé via le barème du template (0-100). */
  percentage: number;
  /** Mention résolue via `FormTemplate.conversionTable`. */
  mention: string;
  /** Zone de conseils / observations en texte libre. */
  advice?: string;
}

/** Une signature apposée sur le formulaire. */
export interface SignatureResponse {
  role: SignatoryRole;
  signedByName?: string;
  signedAt?: string;
  /**
   * Lieu de signature ("Fait à ... le ..." dans les documents officiels).
   * Pas encore saisi par l'écran de signature mobile (voir
   * `SignaturePadField`) — présent dès maintenant pour que le PDF généré
   * puisse l'afficher lorsqu'il sera collecté.
   */
  place?: string;
  /** Image de la signature (trait manuscrit capturé sur mobile), encodée en base64. */
  signatureImageBase64?: string;
}

/**
 * Un formulaire rempli (instance) rattaché à un `FormTemplate`.
 * Une ligne de la table `form_submissions` correspond à un objet de ce
 * type : `header`, `sections` et `signatures` sont stockés en JSONB.
 */
export interface FormSubmission {
  id: string;
  templateId: string;
  formCode: FormCode;
  /** Dénormalisé depuis le header pour faciliter les recherches (numéro de rapport). */
  reportNumber: string;
  /** Dénormalisé depuis le header pour faciliter les recherches (année scolaire). */
  schoolYear: string;
  header: FormHeaderValues;
  sections: SectionResponse[];
  signatures: SignatureResponse[];
  status: FormSubmissionStatus;
  /** Identifiant de l'inspecteur ayant créé le formulaire. */
  createdBy?: string;
  /**
   * Liens relationnels optionnels vers les référentiels (voir
   * `shared/src/types/directory.ts`) — distincts du contenu texte libre
   * de `header` (qui reste la source de vérité pour le PDF/l'affichage :
   * "Etablissement : Institut de la Paix"). Utilisés pour l'autorisation
   * par rôle et les tableaux de bord (voir `modules/auth`), pas toujours
   * renseignés (ex: anciens formulaires, saisie non liée à l'annuaire).
   */
  etablissementId?: string | null;
  enseignantId?: string | null;
  inspecteurId?: string | null;
  /** Identifiant de l'appareil mobile à l'origine de la saisie (traçabilité offline-first). */
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  syncedAt?: string;
}
