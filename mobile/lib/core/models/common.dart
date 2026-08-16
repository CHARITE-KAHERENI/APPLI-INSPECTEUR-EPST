/// Types communs au modèle de "formulaire dynamique" c3-digital.
///
/// Miroir Dart de `shared/src/types/common.ts` — tenu manuellement en
/// synchronisation tant que le mobile ne consomme pas directement le JSON
/// Schema partagé.

/// Les 5 formulaires officiels IGE pris en charge par la plateforme.
enum FormCode {
  c2('C2'),
  c3('C3'),
  c3b('C3B'),
  c3m('C3M'),
  c3das('C3_DAS');

  const FormCode(this.code);

  final String code;

  static FormCode fromCode(String code) {
    return FormCode.values.firstWhere(
      (value) => value.code == code,
      orElse: () => throw ArgumentError('Code de formulaire inconnu: $code'),
    );
  }
}

/// Rôle des trois signataires prévus par les formulaires IGE.
enum SignatoryRole {
  enseignant,
  chefEtablissement('chef_etablissement'),
  inspecteur;

  const SignatoryRole([String? value]) : _value = value;

  final String? _value;

  String get value => _value ?? name;

  static SignatoryRole fromValue(String value) {
    return SignatoryRole.values.firstWhere(
      (role) => role.value == value,
      orElse: () => throw ArgumentError('Rôle de signature inconnu: $value'),
    );
  }
}

/// Type de champ utilisable dans l'en-tête d'un formulaire.
enum FormFieldType { text, textarea, date, number, select }

FormFieldType formFieldTypeFromString(String value) {
  return FormFieldType.values.firstWhere((v) => v.name == value);
}

class FieldOption {
  const FieldOption({required this.value, required this.label});

  factory FieldOption.fromJson(Map<String, dynamic> json) {
    return FieldOption(value: json['value'] as String, label: json['label'] as String);
  }

  final String value;
  final String label;
}
