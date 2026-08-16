import '../../../core/models/common.dart';

/// État de saisie local d'un critère officiel (0 à 4) + son observation.
class CriterionDraft {
  const CriterionDraft({this.score, this.observation = ''});

  factory CriterionDraft.fromJson(Map<String, dynamic> json) {
    return CriterionDraft(score: json['score'] as int?, observation: json['observation'] as String? ?? '');
  }

  /// null = pas encore noté.
  final int? score;
  final String observation;

  CriterionDraft copyWith({int? score, bool clearScore = false, String? observation}) {
    return CriterionDraft(
      score: clearScore ? null : (score ?? this.score),
      observation: observation ?? this.observation,
    );
  }

  Map<String, dynamic> toJson() => {'score': score, 'observation': observation};
}

/// Une observation ajoutée librement par l'inspecteur pendant la saisie —
/// distincte des critères officiels, jamais fusionnée avec eux.
class CustomObservationDraft {
  const CustomObservationDraft({required this.id, this.label = '', this.note = ''});

  factory CustomObservationDraft.fromJson(Map<String, dynamic> json) {
    return CustomObservationDraft(
      id: json['id'] as String,
      label: json['label'] as String? ?? '',
      note: json['note'] as String? ?? '',
    );
  }

  final String id;
  final String label;
  final String note;

  CustomObservationDraft copyWith({String? label, String? note}) {
    return CustomObservationDraft(id: id, label: label ?? this.label, note: note ?? this.note);
  }

  Map<String, dynamic> toJson() => {'id': id, 'label': label, 'note': note};
}

/// État de saisie local d'une section : réponses aux critères officiels,
/// conseils, et observations personnalisées ajoutées par l'inspecteur.
class SectionDraft {
  const SectionDraft({
    required this.sectionId,
    this.criteria = const {},
    this.advice = '',
    this.customObservations = const [],
  });

  factory SectionDraft.fromJson(Map<String, dynamic> json) {
    final criteriaJson = (json['criteria'] as Map<String, dynamic>?) ?? {};
    return SectionDraft(
      sectionId: json['sectionId'] as String,
      criteria: criteriaJson.map(
        (key, value) => MapEntry(key, CriterionDraft.fromJson(value as Map<String, dynamic>)),
      ),
      advice: json['advice'] as String? ?? '',
      customObservations: (json['customObservations'] as List<dynamic>? ?? [])
          .map((c) => CustomObservationDraft.fromJson(c as Map<String, dynamic>))
          .toList(),
    );
  }

  final String sectionId;
  final Map<String, CriterionDraft> criteria;
  final String advice;
  final List<CustomObservationDraft> customObservations;

  SectionDraft copyWith({
    Map<String, CriterionDraft>? criteria,
    String? advice,
    List<CustomObservationDraft>? customObservations,
  }) {
    return SectionDraft(
      sectionId: sectionId,
      criteria: criteria ?? this.criteria,
      advice: advice ?? this.advice,
      customObservations: customObservations ?? this.customObservations,
    );
  }

  Map<String, dynamic> toJson() => {
    'sectionId': sectionId,
    'criteria': criteria.map((key, value) => MapEntry(key, value.toJson())),
    'advice': advice,
    'customObservations': customObservations.map((c) => c.toJson()).toList(),
  };
}

/// État de saisie local d'une signature (dessin tactile).
class SignatureDraft {
  const SignatureDraft({required this.role, this.pngBase64, this.signedByName, this.signedAt});

  factory SignatureDraft.fromJson(Map<String, dynamic> json) {
    return SignatureDraft(
      role: SignatoryRole.fromValue(json['role'] as String),
      pngBase64: json['pngBase64'] as String?,
      signedByName: json['signedByName'] as String?,
      signedAt: json['signedAt'] != null ? DateTime.parse(json['signedAt'] as String) : null,
    );
  }

  final SignatoryRole role;
  final String? pngBase64;
  final String? signedByName;
  final DateTime? signedAt;

  bool get isSigned => pngBase64 != null && pngBase64!.isNotEmpty;

  SignatureDraft copyWith({String? pngBase64, String? signedByName, DateTime? signedAt}) {
    return SignatureDraft(
      role: role,
      pngBase64: pngBase64 ?? this.pngBase64,
      signedByName: signedByName ?? this.signedByName,
      signedAt: signedAt ?? this.signedAt,
    );
  }

  Map<String, dynamic> toJson() => {
    'role': role.value,
    if (pngBase64 != null) 'pngBase64': pngBase64,
    if (signedByName != null) 'signedByName': signedByName,
    if (signedAt != null) 'signedAt': signedAt!.toIso8601String(),
  };
}

/// Statut de cycle de vie du brouillon, identique à `FormSubmissionStatus`
/// partagé : brouillon -> soumis -> synchronise.
enum DraftStatus {
  brouillon,
  soumis,
  synchronise;

  static DraftStatus fromValue(String value) {
    return DraftStatus.values.firstWhere((v) => v.name == value, orElse: () => DraftStatus.brouillon);
  }
}

/// Brouillon local d'un formulaire en cours de remplissage — persisté en
/// SQLite à chaque modification (voir `FormDraftRepository`), pour ne rien
/// perdre en cas de fermeture de l'application ou de coupure de courant.
///
/// Ce modèle est propre au mobile (état d'édition en cours) : il est
/// converti vers le `FormSubmission` partagé (voir
/// `core/models/form_submission.dart`) uniquement au moment de la
/// synchronisation avec le backend.
class FormDraft {
  const FormDraft({
    required this.id,
    required this.formCode,
    required this.templateId,
    required this.templateVersion,
    required this.header,
    required this.sections,
    required this.signatures,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FormDraft.fromJson(Map<String, dynamic> json) {
    return FormDraft(
      id: json['id'] as String,
      formCode: FormCode.fromCode(json['formCode'] as String),
      templateId: json['templateId'] as String,
      templateVersion: json['templateVersion'] as String,
      header: Map<String, dynamic>.from(json['header'] as Map),
      sections: (json['sections'] as List<dynamic>)
          .map((s) => SectionDraft.fromJson(s as Map<String, dynamic>))
          .toList(),
      signatures: (json['signatures'] as List<dynamic>)
          .map((s) => SignatureDraft.fromJson(s as Map<String, dynamic>))
          .toList(),
      status: DraftStatus.fromValue(json['status'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  final String id;
  final FormCode formCode;
  final String templateId;
  final String templateVersion;
  final Map<String, dynamic> header;
  final List<SectionDraft> sections;
  final List<SignatureDraft> signatures;
  final DraftStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;

  SectionDraft sectionFor(String sectionId) {
    return sections.firstWhere(
      (s) => s.sectionId == sectionId,
      orElse: () => SectionDraft(sectionId: sectionId),
    );
  }

  SignatureDraft signatureFor(SignatoryRole role) {
    return signatures.firstWhere(
      (s) => s.role == role,
      orElse: () => SignatureDraft(role: role),
    );
  }

  FormDraft copyWith({
    Map<String, dynamic>? header,
    List<SectionDraft>? sections,
    List<SignatureDraft>? signatures,
    DraftStatus? status,
    DateTime? updatedAt,
  }) {
    return FormDraft(
      id: id,
      formCode: formCode,
      templateId: templateId,
      templateVersion: templateVersion,
      header: header ?? this.header,
      sections: sections ?? this.sections,
      signatures: signatures ?? this.signatures,
      status: status ?? this.status,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Remplace (ou ajoute) l'état d'une section, en conservant l'ordre.
  FormDraft withSection(SectionDraft updated) {
    final next = sections.map((s) => s.sectionId == updated.sectionId ? updated : s).toList();
    if (!next.any((s) => s.sectionId == updated.sectionId)) {
      next.add(updated);
    }
    return copyWith(sections: next, updatedAt: DateTime.now());
  }

  /// Remplace (ou ajoute) une signature.
  FormDraft withSignature(SignatureDraft updated) {
    final next = signatures.map((s) => s.role == updated.role ? updated : s).toList();
    if (!next.any((s) => s.role == updated.role)) {
      next.add(updated);
    }
    return copyWith(signatures: next, updatedAt: DateTime.now());
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'formCode': formCode.code,
    'templateId': templateId,
    'templateVersion': templateVersion,
    'header': header,
    'sections': sections.map((s) => s.toJson()).toList(),
    'signatures': signatures.map((s) => s.toJson()).toList(),
    'status': status.name,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
  };
}
