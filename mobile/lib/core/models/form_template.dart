import 'common.dart';

/// Modèle ("template") complet d'un formulaire dynamique IGE.
///
/// Miroir Dart de `shared/src/types/form-template.ts`. Chargé depuis les
/// assets JSON embarqués (voir `assets/form-templates/`, synchronisés
/// depuis `shared/forms/` par `scripts/sync-mobile-assets.sh`) ou, à
/// terme, depuis l'API backend (`GET /form-templates`).
class FormTemplate {
  const FormTemplate({
    required this.id,
    required this.code,
    required this.name,
    required this.version,
    required this.header,
    required this.fieldGroups,
    required this.sections,
    required this.conversionTable,
    required this.synthesis,
    required this.signatures,
    required this.isActive,
    this.description,
  });

  factory FormTemplate.fromJson(Map<String, dynamic> json) {
    return FormTemplate(
      id: json['id'] as String,
      code: FormCode.fromCode(json['code'] as String),
      name: json['name'] as String,
      version: json['version'] as String,
      description: json['description'] as String?,
      isActive: json['isActive'] as bool,
      header: FormHeaderTemplate.fromJson(json['header'] as Map<String, dynamic>),
      fieldGroups: (json['fieldGroups'] as List<dynamic>)
          .map((g) => FormFieldGroup.fromJson(g as Map<String, dynamic>))
          .toList(),
      sections: (json['sections'] as List<dynamic>)
          .map((s) => FormSectionTemplate.fromJson(s as Map<String, dynamic>))
          .toList(),
      conversionTable: ConversionTable.fromJson(json['conversionTable'] as Map<String, dynamic>),
      synthesis: SynthesisTemplate.fromJson(json['synthesis'] as Map<String, dynamic>),
      signatures: SignatureZoneTemplate.fromJson(json['signatures'] as Map<String, dynamic>),
    );
  }

  final String id;
  final FormCode code;
  final String name;
  final String version;
  final String? description;
  final bool isActive;
  final FormHeaderTemplate header;
  final List<FormFieldGroup> fieldGroups;
  final List<FormSectionTemplate> sections;
  final ConversionTable conversionTable;
  final SynthesisTemplate synthesis;
  final SignatureZoneTemplate signatures;
}

class FormHeaderField {
  const FormHeaderField({
    required this.key,
    required this.label,
    required this.type,
    required this.isRequired,
    required this.common,
    required this.order,
    this.code,
    this.options,
    this.helpText,
  });

  factory FormHeaderField.fromJson(Map<String, dynamic> json) {
    return FormHeaderField(
      key: json['key'] as String,
      code: json['code'] as String?,
      label: json['label'] as String,
      type: formFieldTypeFromString(json['type'] as String),
      isRequired: json['required'] as bool,
      common: json['common'] as bool,
      order: json['order'] as int,
      options: (json['options'] as List<dynamic>?)
          ?.map((o) => FieldOption.fromJson(o as Map<String, dynamic>))
          .toList(),
      helpText: json['helpText'] as String?,
    );
  }

  final String key;
  final String? code;
  final String label;
  final FormFieldType type;
  final bool isRequired;
  final bool common;
  final int order;
  final List<FieldOption>? options;
  final String? helpText;
}

class FormHeaderTemplate {
  const FormHeaderTemplate({required this.fields});

  factory FormHeaderTemplate.fromJson(Map<String, dynamic> json) {
    return FormHeaderTemplate(
      fields: (json['fields'] as List<dynamic>)
          .map((f) => FormHeaderField.fromJson(f as Map<String, dynamic>))
          .toList(),
    );
  }

  final List<FormHeaderField> fields;
}

/// Un groupe de champs non notés hors en-tête (ex: "Activité(s)
/// inspectée(s)", ou "Implantation" / "Structure" notées E/TB/B/AB/M pour C2).
class FormFieldGroup {
  const FormFieldGroup({required this.id, required this.title, required this.fields, this.code, this.description});

  factory FormFieldGroup.fromJson(Map<String, dynamic> json) {
    return FormFieldGroup(
      id: json['id'] as String,
      code: json['code'] as String?,
      title: json['title'] as String,
      description: json['description'] as String?,
      fields: (json['fields'] as List<dynamic>)
          .map((f) => FormHeaderField.fromJson(f as Map<String, dynamic>))
          .toList(),
    );
  }

  final String id;
  final String? code;
  final String title;
  final String? description;
  final List<FormHeaderField> fields;
}

/// Un critère d'évaluation, noté de 0 à 4, appartenant à une section.
class FormCriterion {
  const FormCriterion({
    required this.id,
    required this.label,
    required this.maxScore,
    required this.order,
    this.code,
    this.description,
    this.weight,
  });

  factory FormCriterion.fromJson(Map<String, dynamic> json) {
    return FormCriterion(
      id: json['id'] as String,
      code: json['code'] as String?,
      label: json['label'] as String,
      description: json['description'] as String?,
      maxScore: json['maxScore'] as int,
      weight: (json['weight'] as num?)?.toDouble(),
      order: json['order'] as int,
    );
  }

  final String id;
  final String? code;
  final String label;
  final String? description;
  final int maxScore;
  final double? weight;
  final int order;
}

/// Champ personnalisable ajouté localement — toujours vide dans les
/// configurations officielles, jamais fusionné avec [FormCriterion].
class CustomField {
  const CustomField({required this.id, required this.label, required this.type, required this.order, this.maxScore});

  factory CustomField.fromJson(Map<String, dynamic> json) {
    return CustomField(
      id: json['id'] as String,
      label: json['label'] as String,
      type: formFieldTypeFromString(json['type'] as String),
      maxScore: json['maxScore'] as int?,
      order: json['order'] as int,
    );
  }

  final String id;
  final String label;
  final FormFieldType type;
  final int? maxScore;
  final int order;
}

/// Zone de conseils / observations en texte libre, propre à chaque section.
class AdviceZoneTemplate {
  const AdviceZoneTemplate({required this.enabled, required this.label, required this.isRequired, this.placeholder});

  factory AdviceZoneTemplate.fromJson(Map<String, dynamic> json) {
    return AdviceZoneTemplate(
      enabled: json['enabled'] as bool,
      label: json['label'] as String,
      placeholder: json['placeholder'] as String?,
      isRequired: json['required'] as bool,
    );
  }

  final bool enabled;
  final String label;
  final String? placeholder;
  final bool isRequired;
}

/// Une section d'un formulaire : critères notés + conseils. Le barème de
/// conversion n'est plus porté par la section : voir [ConversionTable]
/// (partagé au niveau du [FormTemplate]).
class FormSectionTemplate {
  const FormSectionTemplate({
    required this.id,
    required this.code,
    required this.title,
    required this.order,
    required this.criteria,
    required this.observationsLabel,
    required this.adviceZone,
    required this.customFields,
    this.description,
  });

  factory FormSectionTemplate.fromJson(Map<String, dynamic> json) {
    return FormSectionTemplate(
      id: json['id'] as String,
      code: json['code'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      order: json['order'] as int,
      criteria: (json['criteria'] as List<dynamic>)
          .map((c) => FormCriterion.fromJson(c as Map<String, dynamic>))
          .toList(),
      observationsLabel: json['observationsLabel'] as String,
      adviceZone: AdviceZoneTemplate.fromJson(json['adviceZone'] as Map<String, dynamic>),
      customFields: (json['custom_fields'] as List<dynamic>)
          .map((c) => CustomField.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }

  final String id;
  final String code;
  final String title;
  final String? description;
  final int order;
  final List<FormCriterion> criteria;
  final String observationsLabel;
  final AdviceZoneTemplate adviceZone;
  final List<CustomField> customFields;
}

/// Une plage de notes brutes, pour une bande de mention et un nombre de
/// critères (N) donnés.
class ConversionRange {
  const ConversionRange({required this.min, required this.max});

  factory ConversionRange.fromJson(Map<String, dynamic> json) {
    return ConversionRange(min: json['min'] as int, max: json['max'] as int);
  }

  final int min;
  final int max;

  bool contains(int value) => value >= min && value <= max;
}

/// Une ligne du "Tableau de conversion" officiel, pour un nombre de
/// critères N donné.
class ConversionTableRow {
  const ConversionTableRow({required this.criteriaCount, required this.ranges});

  factory ConversionTableRow.fromJson(Map<String, dynamic> json) {
    return ConversionTableRow(
      criteriaCount: json['criteriaCount'] as int,
      ranges: (json['ranges'] as List<dynamic>)
          .map((r) => ConversionRange.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  final int criteriaCount;
  final List<ConversionRange> ranges;
}

/// Une bande de mention (colonne du tableau officiel : note-sur-4, %, mention).
class ConversionBand {
  const ConversionBand({
    required this.scoreOn4,
    required this.minPercentage,
    required this.maxPercentage,
    required this.mention,
    this.secondaryMention,
  });

  factory ConversionBand.fromJson(Map<String, dynamic> json) {
    return ConversionBand(
      scoreOn4: json['scoreOn4'] as int,
      minPercentage: (json['minPercentage'] as num).toDouble(),
      maxPercentage: (json['maxPercentage'] as num).toDouble(),
      mention: json['mention'] as String,
      secondaryMention: json['secondaryMention'] as String?,
    );
  }

  final int scoreOn4;
  final double minPercentage;
  final double maxPercentage;
  final String mention;
  final String? secondaryMention;
}

enum ConversionTableMode {
  lookupByCriteriaCount('lookup_by_criteria_count'),
  percentageOnly('percentage_only');

  const ConversionTableMode(this.value);

  final String value;

  static ConversionTableMode fromValue(String value) {
    return ConversionTableMode.values.firstWhere((v) => v.value == value);
  }
}

/// Barème de conversion note -> pourcentage -> mention, partagé par toutes
/// les sections du formulaire (un seul "Tableau de conversion" par document
/// officiel). Voir shared/src/scoring.ts pour l'algorithme de référence.
class ConversionTable {
  const ConversionTable({required this.mode, required this.bands, this.rows});

  factory ConversionTable.fromJson(Map<String, dynamic> json) {
    return ConversionTable(
      mode: ConversionTableMode.fromValue(json['mode'] as String),
      bands: (json['bands'] as List<dynamic>)
          .map((b) => ConversionBand.fromJson(b as Map<String, dynamic>))
          .toList(),
      rows: (json['rows'] as List<dynamic>?)
          ?.map((r) => ConversionTableRow.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  final ConversionTableMode mode;
  final List<ConversionBand> bands;
  final List<ConversionTableRow>? rows;
}

class SignatureRoleTemplate {
  const SignatureRoleTemplate({
    required this.role,
    required this.label,
    required this.isRequired,
    required this.order,
  });

  factory SignatureRoleTemplate.fromJson(Map<String, dynamic> json) {
    return SignatureRoleTemplate(
      role: SignatoryRole.fromValue(json['role'] as String),
      label: json['label'] as String,
      isRequired: json['required'] as bool,
      order: json['order'] as int,
    );
  }

  final SignatoryRole role;
  final String label;
  final bool isRequired;
  final int order;
}

class SignatureZoneTemplate {
  const SignatureZoneTemplate({required this.roles});

  factory SignatureZoneTemplate.fromJson(Map<String, dynamic> json) {
    return SignatureZoneTemplate(
      roles: (json['roles'] as List<dynamic>)
          .map((r) => SignatureRoleTemplate.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  final List<SignatureRoleTemplate> roles;
}

class SynthesisRow {
  const SynthesisRow({required this.sectionId, required this.label});

  factory SynthesisRow.fromJson(Map<String, dynamic> json) {
    return SynthesisRow(sectionId: json['sectionId'] as String, label: json['label'] as String);
  }

  final String sectionId;
  final String label;
}

/// Bloc de synthèse finale du formulaire (ex : "2.11. EVALUATION
/// SYNTHETIQUE" + "2.12. SIGNATURES" pour C3).
class SynthesisTemplate {
  const SynthesisTemplate({
    required this.title,
    required this.rows,
    required this.finalMentionLabel,
    this.conversionCriteriaCount,
    this.finalMentionHelpText,
    this.sealLabel,
  });

  factory SynthesisTemplate.fromJson(Map<String, dynamic> json) {
    return SynthesisTemplate(
      title: json['title'] as String,
      rows: (json['rows'] as List<dynamic>).map((r) => SynthesisRow.fromJson(r as Map<String, dynamic>)).toList(),
      conversionCriteriaCount: json['conversionCriteriaCount'] as int?,
      finalMentionLabel: json['finalMentionLabel'] as String,
      finalMentionHelpText: json['finalMentionHelpText'] as String?,
      sealLabel: json['sealLabel'] as String?,
    );
  }

  final String title;
  final List<SynthesisRow> rows;
  final int? conversionCriteriaCount;
  final String finalMentionLabel;
  final String? finalMentionHelpText;
  final String? sealLabel;
}
