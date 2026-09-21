import '../models/form_template.dart';
import '../models/scoring.dart';
import '../utils/device_identity.dart';
import '../../features/dynamic_form/models/form_draft.dart';

/// Clés de champs d'en-tête communes aux 5 formulaires (voir
/// shared/forms/*.json) — utilisées pour extraire `reportNumber` et
/// `schoolYear`, exigés par `POST /sync/submissions`.
const _reportNumberKey = 'numero_rapport';
const _schoolYearKey = 'annee_scolaire';

/// Construit une entrée de `POST /sync/submissions` à partir de l'état
/// *courant* du brouillon — recalculant les scores de chaque section à la
/// volée (même algorithme que l'écran de saisie), afin que le serveur
/// reçoive toujours des `sections` au format `SectionResponse` partagé.
///
/// Étend ce format d'une clé `customObservations` par section, propre au
/// mobile (observations personnalisées de l'inspecteur — voir
/// `CustomObservationDraft`) : le backend la stocke telle quelle dans le
/// JSONB `sections` sans la valider strictement, ce qui évite de perdre
/// cette donnée en attendant qu'elle rejoigne le modèle partagé officiel.
Map<String, dynamic> buildSyncPayload({
  required String localId,
  required FormDraft draft,
  required FormTemplate template,
}) {
  final sections = template.sections.map((section) {
    final draftSection = draft.sectionFor(section.id);
    final scores = <String, int>{
      for (final entry in draftSection.criteria.entries)
        if (entry.value.score != null) entry.key: entry.value.score!,
    };
    final result = computeSectionScore(section: section, scores: scores, conversionTable: template.conversionTable);

    return {
      'sectionId': section.id,
      'criteria': [
        for (final entry in draftSection.criteria.entries)
          if (entry.value.score != null)
            {
              'criterionId': entry.key,
              'score': entry.value.score,
              if (entry.value.observation.isNotEmpty) 'comment': entry.value.observation,
            },
      ],
      'totalScore': result.totalScore,
      'maxScore': result.maxScore,
      'percentage': result.percentage,
      'mention': result.mention,
      if (draftSection.advice.isNotEmpty) 'advice': draftSection.advice,
      if (draftSection.customObservations.isNotEmpty)
        'customObservations': draftSection.customObservations.map((o) => o.toJson()).toList(),
    };
  }).toList();

  final signatures = [
    for (final signature in draft.signatures)
      if (signature.isSigned) signature.toJson(),
  ];

  return {
    'localId': localId,
    'id': draft.id,
    'templateId': draft.templateId,
    'formCode': draft.formCode.code,
    'reportNumber': (draft.header[_reportNumberKey] as String?) ?? '',
    'schoolYear': (draft.header[_schoolYearKey] as String?) ?? '',
    'header': draft.header,
    'sections': sections,
    'signatures': signatures,
    'status': draft.status.name,
    'clientUpdatedAt': draft.updatedAt.toIso8601String(),
    if (draft.serverUpdatedAt != null) 'baseServerUpdatedAt': draft.serverUpdatedAt!.toIso8601String(),
    'deviceId': DeviceIdentity.current,
  };
}
