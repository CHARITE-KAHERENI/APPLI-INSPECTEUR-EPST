import 'common.dart';

/// Modèle ("template") complet d'un formulaire dynamique IGE.
///
/// Miroir Dart de `shared/src/types/form-template.ts`. Chargé depuis les
/// assets JSON embarqués (voir `assets/form-templates/`, synchronisés
/// depuis `shared/src/form-templates/` par `scripts/sync-mobile-assets.sh`)
/// ou, à terme, depuis l'API backend (`GET /form-templates`).
class FormTemplate {
  const FormTemplate({
    required this.id,
    required this.code,
    required this.name,
    required this.version,
    required this.header,
    required this.sections,
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
      sections: (json['sections'] as List<dynamic>)
          .map((s) => FormSectionTemplate.fromJson(s as Map<String, dynamic>))
          .toList(),
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
  final List<FormSectionTemplate> sections;
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
    this.options,
    this.helpText,
  });

  factory FormHeaderField.fromJson(Map<String, dynamic> json) {
    return FormHeaderField(
      key: json['key'] as String,
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

/// Une règle du barème : associe une plage de pourcentage à une mention.
class BaremeMentionRule {
  const BaremeMentionRule({
    required this.minPercentage,
    required this.maxPercentage,
    required this.mention,
    this.appreciationCode,
  });

  factory BaremeMentionRule.fromJson(Map<String, dynamic> json) {
    return BaremeMentionRule(
      minPercentage: (json['minPercentage'] as num).toDouble(),
      maxPercentage: (json['maxPercentage'] as num).toDouble(),
      mention: json['mention'] as String,
      appreciationCode: json['appreciationCode'] as String?,
    );
  }

  final double minPercentage;
  final double maxPercentage;
  final String mention;
  final String? appreciationCode;
}

enum BaremeConversionMethod {
  sumToPercentage('sum_to_percentage'),
  averageToPercentage('average_to_percentage');

  const BaremeConversionMethod(this.value);

  final String value;

  static BaremeConversionMethod fromValue(String value) {
    return BaremeConversionMethod.values.firstWhere((v) => v.value == value);
  }
}

/// Barème de conversion note -> pourcentage -> mention, propre à une section.
class SectionBareme {
  const SectionBareme({
    required this.maxScorePerCriterion,
    required this.conversionMethod,
    required this.mentionRules,
  });

  factory SectionBareme.fromJson(Map<String, dynamic> json) {
    return SectionBareme(
      maxScorePerCriterion: json['maxScorePerCriterion'] as int,
      conversionMethod: BaremeConversionMethod.fromValue(json['conversionMethod'] as String),
      mentionRules: (json['mentionRules'] as List<dynamic>)
          .map((r) => BaremeMentionRule.fromJson(r as Map<String, dynamic>))
          .toList(),
    );
  }

  final int maxScorePerCriterion;
  final BaremeConversionMethod conversionMethod;
  final List<BaremeMentionRule> mentionRules;

  /// Résout la mention correspondant à un pourcentage donné.
  String mentionFor(double percentage) {
    final rule = mentionRules.firstWhere(
      (r) => percentage >= r.minPercentage && percentage <= r.maxPercentage,
      orElse: () => throw StateError(
        'Aucune règle de barème ne couvre $percentage%. '
        'Vérifiez que mentionRules couvre bien 0-100 sans trou.',
      ),
    );
    return rule.mention;
  }
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

/// Une section d'un formulaire : critères notés + barème + conseils.
class FormSectionTemplate {
  const FormSectionTemplate({
    required this.id,
    required this.code,
    required this.title,
    required this.order,
    required this.criteria,
    required this.bareme,
    required this.adviceZone,
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
      bareme: SectionBareme.fromJson(json['bareme'] as Map<String, dynamic>),
      adviceZone: AdviceZoneTemplate.fromJson(json['adviceZone'] as Map<String, dynamic>),
    );
  }

  final String id;
  final String code;
  final String title;
  final String? description;
  final int order;
  final List<FormCriterion> criteria;
  final SectionBareme bareme;
  final AdviceZoneTemplate adviceZone;
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
