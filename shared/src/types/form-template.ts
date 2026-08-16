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
  /** Numérotation officielle du champ dans le document (ex: "01", "02"). */
  code?: string;
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

/**
 * Un groupe de champs non notés situé hors de l'en-tête et hors des
 * sections à critères (ex : "1. ACTIVITE(S) INSPECTEE(S)" pour C3/C3B/
 * C3_DAS, ou "1.1. Implantation" / "1.2. Structure" pour C2, notées sur une
 * échelle E/TB/B/AB/M plutôt que 0-4).
 */
export interface FormFieldGroup {
  id: string;
  code?: string;
  title: string;
  description?: string;
  fields: FormHeaderField[];
}

/** Un critère d'évaluation, noté de 0 à 4, appartenant à une section. */
export interface FormCriterion {
  id: string;
  /** Code officiel du critère (ex: "2.1.1"). */
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
 * Champ personnalisable ajouté par l'établissement/l'inspecteur. Toujours
 * vide (`[]`) dans les configurations officielles : ne doit jamais être
 * fusionné avec `criteria` (les critères officiels IGE), afin de garder
 * une distinction nette entre le référentiel officiel et les ajouts locaux.
 */
export interface CustomField {
  id: string;
  label: string;
  type: FormFieldType;
  maxScore?: 4;
  order: number;
}

/** Zone de conseils / observations en texte libre, propre à chaque section. */
export interface AdviceZoneTemplate {
  enabled: boolean;
  label: string;
  placeholder?: string;
  required: boolean;
}

/** Une section d'un formulaire : un groupe de critères notés + ses conseils. */
export interface FormSectionTemplate {
  id: string;
  /** Code officiel de la section (ex: "2.1"). */
  code: string;
  title: string;
  description?: string;
  order: number;
  criteria: FormCriterion[];
  /** Libellé de la colonne d'observation par critère (toujours "Observations" dans les documents officiels). */
  observationsLabel: string;
  adviceZone: AdviceZoneTemplate;
  /** Toujours vide dans les configurations officielles — voir {@link CustomField}. */
  custom_fields: CustomField[];
}

/** Une plage de notes brutes, pour une bande de mention et un nombre de critères (N) donnés. */
export interface ConversionRange {
  /** Borne basse de la note brute, incluse. */
  min: number;
  /** Borne haute de la note brute, incluse. */
  max: number;
}

/**
 * Une ligne du "Tableau de conversion" officiel, pour un nombre de
 * critères N donné (colonne "NOTE" du tableau, 2 à 10 dans les documents
 * IGE actuels).
 */
export interface ConversionTableRow {
  /** Nombre de critères notés (section, ou nombre de sections pour la synthèse finale). */
  criteriaCount: number;
  /** Une plage par bande de {@link ConversionTable.bands}, dans le même ordre (4, 3, 2, 1, 0). */
  ranges: ConversionRange[];
}

/** Une bande de mention (colonne du tableau officiel : note-sur-4, %, mention). */
export interface ConversionBand {
  /** Note convertie sur 4 (colonne "4, 3, 2, 1, 0" du tableau officiel). */
  scoreOn4: 4 | 3 | 2 | 1 | 0;
  /** Borne basse du pourcentage (ligne "%" du tableau officiel), incluse. */
  minPercentage: number;
  /** Borne haute du pourcentage, incluse. */
  maxPercentage: number;
  mention: string;
  /**
   * Mention alternative pour l'appréciation finale globale, quand le
   * document officiel définit un second vocabulaire (ex: C2 utilise
   * "GRANDE DISTINCTION / DISTINCTION / SATISFACTION / BALANCE / ECHEC"
   * en plus de "ELITE / TRES BON / BON / ASSEZ BON / MEDIOCRE").
   */
  secondaryMention?: string;
}

/**
 * Barème de conversion note -> pourcentage -> mention du formulaire,
 * partagé par toutes ses sections (un seul "Tableau de conversion" par
 * document officiel).
 *
 * - `lookup_by_criteria_count` (C3, C3B, C3_DAS, C3M) : chaque section, et
 *   l'évaluation synthétique finale, convertissent une note brute en
 *   mention via `rows`, indexé par le nombre de critères concernés (N).
 *   La même table est réutilisée pour la synthèse finale, en indexant sur
 *   le nombre de sections notées (voir {@link SynthesisTemplate.conversionCriteriaCount}).
 * - `percentage_only` (C2) : la conversion se fait directement via
 *   (note obtenue / note maximale) * 100, comparé aux bandes `bands`
 *   (utilisé quand une section compte trop de critères pour un tableau
 *   indexé par N, ex: 67 critères pour "4.1. Gestion administrative").
 */
export interface ConversionTable {
  mode: 'lookup_by_criteria_count' | 'percentage_only';
  bands: ConversionBand[];
  /** Requis si `mode` vaut `lookup_by_criteria_count`. */
  rows?: ConversionTableRow[];
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
 * Bloc de synthèse finale du formulaire (ex : "2.11. EVALUATION
 * SYNTHETIQUE" + "2.12. SIGNATURES" pour C3, ou "5. EVALUATION SYNTHETIQUE
 * INTERMEDIAIRE" + "6. APPRECIATION FINALE" pour C2).
 */
export interface SynthesisTemplate {
  title: string;
  /** Une ligne par section notée, dans l'ordre d'affichage du tableau de synthèse. */
  rows: Array<{ sectionId: string; label: string }>;
  /**
   * Nombre de critères à utiliser pour reconvertir, via
   * `conversionTable.rows`, le total des notes-sur-4 de chaque section
   * (uniquement en mode `lookup_by_criteria_count`) — vaut en pratique le
   * nombre de sections notées.
   */
  conversionCriteriaCount?: number;
  finalMentionLabel: string;
  finalMentionHelpText?: string;
  sealLabel?: string;
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
  /** Groupes de champs non notés hors en-tête (activité inspectée, description/appréciation...). */
  fieldGroups: FormFieldGroup[];
  sections: FormSectionTemplate[];
  conversionTable: ConversionTable;
  synthesis: SynthesisTemplate;
  signatures: SignatureZoneTemplate;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
