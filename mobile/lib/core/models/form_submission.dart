import 'common.dart';

/// Statut de cycle de vie d'un formulaire rempli — essentiel pour la saisie
/// hors-ligne sur mobile : brouillon -> soumis -> synchronise.
enum FormSubmissionStatus {
  brouillon,
  soumis,
  synchronise;

  static FormSubmissionStatus fromValue(String value) {
    return FormSubmissionStatus.values.firstWhere((v) => v.name == value);
  }
}

/// Réponse à un critère : la note donnée (0 à 4) et un commentaire optionnel.
class CriterionResponse {
  const CriterionResponse({required this.criterionId, required this.score, this.comment});

  factory CriterionResponse.fromJson(Map<String, dynamic> json) {
    return CriterionResponse(
      criterionId: json['criterionId'] as String,
      score: json['score'] as int,
      comment: json['comment'] as String?,
    );
  }

  final String criterionId;

  /// Note de 0 à 4.
  final int score;
  final String? comment;

  Map<String, dynamic> toJson() => {
    'criterionId': criterionId,
    'score': score,
    if (comment != null) 'comment': comment,
  };
}

/// Résultat calculé et réponses d'une section pour un formulaire rempli.
class SectionResponse {
  const SectionResponse({
    required this.sectionId,
    required this.criteria,
    required this.totalScore,
    required this.maxScore,
    required this.percentage,
    required this.mention,
    this.advice,
  });

  factory SectionResponse.fromJson(Map<String, dynamic> json) {
    return SectionResponse(
      sectionId: json['sectionId'] as String,
      criteria: (json['criteria'] as List<dynamic>)
          .map((c) => CriterionResponse.fromJson(c as Map<String, dynamic>))
          .toList(),
      totalScore: (json['totalScore'] as num).toDouble(),
      maxScore: (json['maxScore'] as num).toDouble(),
      percentage: (json['percentage'] as num).toDouble(),
      mention: json['mention'] as String,
      advice: json['advice'] as String?,
    );
  }

  final String sectionId;
  final List<CriterionResponse> criteria;
  final double totalScore;
  final double maxScore;
  final double percentage;
  final String mention;
  final String? advice;

  Map<String, dynamic> toJson() => {
    'sectionId': sectionId,
    'criteria': criteria.map((c) => c.toJson()).toList(),
    'totalScore': totalScore,
    'maxScore': maxScore,
    'percentage': percentage,
    'mention': mention,
    if (advice != null) 'advice': advice,
  };
}

/// Une signature apposée sur le formulaire.
class SignatureResponse {
  const SignatureResponse({required this.role, this.signedByName, this.signedAt, this.signatureImageBase64});

  factory SignatureResponse.fromJson(Map<String, dynamic> json) {
    return SignatureResponse(
      role: SignatoryRole.fromValue(json['role'] as String),
      signedByName: json['signedByName'] as String?,
      signedAt: json['signedAt'] != null ? DateTime.parse(json['signedAt'] as String) : null,
      signatureImageBase64: json['signatureImageBase64'] as String?,
    );
  }

  final SignatoryRole role;
  final String? signedByName;
  final DateTime? signedAt;

  /// Image de la signature (trait manuscrit capturé sur mobile), en base64.
  final String? signatureImageBase64;

  Map<String, dynamic> toJson() => {
    'role': role.value,
    if (signedByName != null) 'signedByName': signedByName,
    if (signedAt != null) 'signedAt': signedAt!.toIso8601String(),
    if (signatureImageBase64 != null) 'signatureImageBase64': signatureImageBase64,
  };
}

/// Un formulaire rempli (instance), rattaché à un [FormTemplate].
///
/// Saisi potentiellement hors-ligne, persisté localement (statut
/// `brouillon`), puis synchronisé vers le backend une fois soumis.
class FormSubmission {
  const FormSubmission({
    required this.id,
    required this.templateId,
    required this.formCode,
    required this.reportNumber,
    required this.schoolYear,
    required this.header,
    required this.sections,
    required this.signatures,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.createdBy,
    this.deviceId,
    this.submittedAt,
    this.syncedAt,
  });

  factory FormSubmission.fromJson(Map<String, dynamic> json) {
    return FormSubmission(
      id: json['id'] as String,
      templateId: json['templateId'] as String,
      formCode: FormCode.fromCode(json['formCode'] as String),
      reportNumber: json['reportNumber'] as String,
      schoolYear: json['schoolYear'] as String,
      header: Map<String, dynamic>.from(json['header'] as Map),
      sections: (json['sections'] as List<dynamic>)
          .map((s) => SectionResponse.fromJson(s as Map<String, dynamic>))
          .toList(),
      signatures: (json['signatures'] as List<dynamic>)
          .map((s) => SignatureResponse.fromJson(s as Map<String, dynamic>))
          .toList(),
      status: FormSubmissionStatus.fromValue(json['status'] as String),
      createdBy: json['createdBy'] as String?,
      deviceId: json['deviceId'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      submittedAt: json['submittedAt'] != null ? DateTime.parse(json['submittedAt'] as String) : null,
      syncedAt: json['syncedAt'] != null ? DateTime.parse(json['syncedAt'] as String) : null,
    );
  }

  final String id;
  final String templateId;
  final FormCode formCode;
  final String reportNumber;
  final String schoolYear;
  final Map<String, dynamic> header;
  final List<SectionResponse> sections;
  final List<SignatureResponse> signatures;
  final FormSubmissionStatus status;
  final String? createdBy;
  final String? deviceId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? submittedAt;
  final DateTime? syncedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'templateId': templateId,
    'formCode': formCode.code,
    'reportNumber': reportNumber,
    'schoolYear': schoolYear,
    'header': header,
    'sections': sections.map((s) => s.toJson()).toList(),
    'signatures': signatures.map((s) => s.toJson()).toList(),
    'status': status.name,
    if (createdBy != null) 'createdBy': createdBy,
    if (deviceId != null) 'deviceId': deviceId,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    if (submittedAt != null) 'submittedAt': submittedAt!.toIso8601String(),
    if (syncedAt != null) 'syncedAt': syncedAt!.toIso8601String(),
  };
}
