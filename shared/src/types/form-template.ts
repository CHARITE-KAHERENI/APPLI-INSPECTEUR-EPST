import {
  FieldOption,
  FormCode,
  FormFieldType,
  SignatoryRole,
} from './common';

/**
 * Un champ de l'en-tête commun (inspecteur, établissement, enseignant /
 * entité inspectée, année scolaire, numéro de rapport, etc.).
 *
 * L'en-tête est modélisé comme une liste de champs plutôt que codé en dur,
 * afin que chaque formulaire (C2, C3, C3B, C3M, C3_DAS) puisse réutiliser
 * le socle commun tout en ajoutant ses propres champs spécifiques
 * (ex : matière enseignée pour C3, fonction de maîtrise pour C3M...).
 */
export interface FormHeaderField {
  /** Clé technique stable, utilisée pour stocker la valeur (ex: "inspecteur"). */
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  /** Options pour les champs de type "select". */
  options?: FieldOption[];
  /** Regroupe les champs communs à tous les formulaires vs spécifiques. */
  common: boolean;
  /** Ordre d'affichage dans l'en-tête. */
  order: number;
  helpText?: string;
}

export interface FormHeaderTemplate {
  fields: FormHeaderField[];
}

/** Un critère d'évaluation, noté de 0 à 4, appartenant à une section. */
export interface FormCriterion {
  id: string;
  /** Code court éventuel utilisé dans les documents officiels (ex: "1.1"). */
  code?: string;
  label: string;
  description?: string;
  /** Note maximale du critère. Toujours 4 dans le référentiel IGE actuel. */
  maxScore: 4;
  /** Pondération optionnelle si tous les critères d'une section ne pèsent pas pareil. */
  weight?: number;
  order: number;
}

/**
 * Une règle du barème : associe une plage de pourcentage à une mention
 * (ex: "Excellent", "Bien", "Assez-bien", "Passable", "Insuffisant").
 * Les plages doivent être contiguës et couvrir 0-100 pour une section donnée.
 */
export interface BaremeMentionRule {
  /** Borne basse du pourcentage, incluse. */
  minPercentage: number;
  /** Borne haute du pourcentage, incluse. */
  maxPercentage: number;
  mention: string;
  /** Couleur ou code d'appréciation optionnel pour l'affichage (UI). */
  appreciationCode?: string;
}

/**
 * Barème de conversion note -> pourcentage -> mention, propre à une section.
 * `sum_to_percentage` : (somme des notes obtenues / somme des notes max) * 100
 * `average_to_percentage` : (moyenne des notes obtenues / maxScorePerCriterion) * 100
 */
export type BaremeConversionMethod = 'sum_to_percentage' | 'average_to_percentage';

export interface SectionBareme {
  maxScorePerCriterion: 4;
  conversionMethod: BaremeConversionMethod;
  mentionRules: BaremeMentionRule[];
}

/** Zone de conseils / observations en texte libre, propre à chaque section. */
export interface AdviceZoneTemplate {
  enabled: boolean;
  label: string;
  placeholder?: string;
  required: boolean;
}

/** Une section d'un formulaire : un groupe de critères notés + son barème + ses conseils. */
export interface FormSectionTemplate {
  id: string;
  code: string;
  title: string;
  description?: string;
  order: number;
  criteria: FormCriterion[];
  bareme: SectionBareme;
  adviceZone: AdviceZoneTemplate;
}

/** Un rôle de signature attendu par le formulaire (enseignant, chef d'établissement, inspecteur). */
export interface SignatureRoleTemplate {
  role: SignatoryRole;
  label: string;
  required: boolean;
  order: number;
}

/** Zone de signatures d'un formulaire. */
export interface SignatureZoneTemplate {
  roles: SignatureRoleTemplate[];
}

/**
 * Modèle ("template") complet d'un formulaire dynamique IGE.
 * Une ligne de la table `form_templates` correspond à un objet de ce type
 * (stocké en JSONB), versionné par `version`.
 */
export interface FormTemplate {
  id: string;
  code: FormCode;
  name: string;
  /** Version sémantique du template (ex: "1.0.0"). */
  version: string;
  description?: string;
  header: FormHeaderTemplate;
  sections: FormSectionTemplate[];
  signatures: SignatureZoneTemplate;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
