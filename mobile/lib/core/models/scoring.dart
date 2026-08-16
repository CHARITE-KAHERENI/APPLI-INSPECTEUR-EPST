import 'form_template.dart';

/// Calcul note -> pourcentage -> mention, réimplémentation Dart de
/// `shared/src/scoring.ts` à partir du même modèle [ConversionTable].
///
/// Différence assumée avec la version TypeScript (pensée pour une
/// section entièrement remplie, côté backend) : ici, les critères non
/// encore notés comptent pour 0 (au lieu d'être exclus du calcul), afin
/// d'afficher un score cumulé qui progresse en temps réel pendant la
/// saisie plutôt que de rester artificiellement élevé tant que la section
/// n'est pas terminée. Les deux implémentations convergent vers le même
/// résultat une fois tous les critères renseignés.
class ConversionTableError extends StateError {
  ConversionTableError(super.message);
}

class ConversionResult {
  const ConversionResult({required this.scoreOn4, required this.percentage, required this.mention});

  final int scoreOn4;
  final double percentage;
  final String mention;
}

class SectionScoreResult {
  const SectionScoreResult({
    required this.totalScore,
    required this.maxScore,
    required this.percentage,
    required this.mention,
    required this.scoreOn4,
    required this.answeredCount,
    required this.criteriaCount,
  });

  final int totalScore;
  final int maxScore;
  final double percentage;
  final String mention;
  final int scoreOn4;
  final int answeredCount;
  final int criteriaCount;

  bool get isComplete => answeredCount >= criteriaCount;
}

/// Convertit une note brute en pourcentage + mention, via le "Tableau de
/// conversion" du formulaire.
///
/// [criteriaCount] est requis en mode `lookupByCriteriaCount` : le nombre
/// de critères concernés (section), ou le nombre de sections pour la
/// synthèse finale.
ConversionResult convertRawScore({
  required ConversionTable table,
  required int rawScore,
  required int maxScore,
  int? criteriaCount,
}) {
  final percentage = maxScore == 0 ? 0.0 : ((rawScore / maxScore) * 10000).roundToDouble() / 100;

  if (table.mode == ConversionTableMode.percentageOnly) {
    for (final band in table.bands) {
      if (percentage >= band.minPercentage && percentage <= band.maxPercentage) {
        return ConversionResult(scoreOn4: band.scoreOn4, percentage: percentage, mention: band.mention);
      }
    }
    throw ConversionTableError('Aucune bande de conversion ne couvre $percentage%.');
  }

  final rows = table.rows;
  if (criteriaCount == null || rows == null) {
    throw ArgumentError('criteriaCount et conversionTable.rows sont requis en mode lookup_by_criteria_count.');
  }
  ConversionTableRow? row;
  for (final candidate in rows) {
    if (candidate.criteriaCount == criteriaCount) {
      row = candidate;
      break;
    }
  }
  if (row == null) {
    throw ConversionTableError('Aucune ligne du tableau de conversion pour $criteriaCount critères.');
  }
  for (var i = 0; i < row.ranges.length && i < table.bands.length; i++) {
    if (row.ranges[i].contains(rawScore)) {
      final band = table.bands[i];
      return ConversionResult(scoreOn4: band.scoreOn4, percentage: percentage, mention: band.mention);
    }
  }
  throw ConversionTableError('Aucune plage ne couvre la note $rawScore pour $criteriaCount critères.');
}

/// Calcule le score d'une section à partir des notes déjà saisies
/// (`scores`, indexé par identifiant de critère — les critères absents de
/// la map comptent pour 0).
SectionScoreResult computeSectionScore({
  required FormSectionTemplate section,
  required Map<String, int> scores,
  required ConversionTable conversionTable,
}) {
  var totalScore = 0;
  var maxScore = 0;
  var answeredCount = 0;

  for (final criterion in section.criteria) {
    final score = scores[criterion.id];
    if (score != null) {
      answeredCount++;
      totalScore += score;
    }
    maxScore += criterion.maxScore;
  }

  final result = convertRawScore(
    table: conversionTable,
    rawScore: totalScore,
    maxScore: maxScore,
    criteriaCount: section.criteria.length,
  );

  return SectionScoreResult(
    totalScore: totalScore,
    maxScore: maxScore,
    percentage: result.percentage,
    mention: result.mention,
    scoreOn4: result.scoreOn4,
    answeredCount: answeredCount,
    criteriaCount: section.criteria.length,
  );
}

/// Calcule l'évaluation synthétique finale à partir des scores de chaque
/// section (`sectionScores`, indexé par identifiant de section), en
/// reconvertissant la somme des notes-sur-4 via le même tableau de
/// conversion — voir `SynthesisTemplate.conversionCriteriaCount`.
ConversionResult computeSynthesisScore({
  required FormTemplate template,
  required Map<String, SectionScoreResult> sectionScores,
}) {
  var totalScoreOn4 = 0;
  final rowCount = template.synthesis.rows.length;

  for (final row in template.synthesis.rows) {
    totalScoreOn4 += sectionScores[row.sectionId]?.scoreOn4 ?? 0;
  }

  final maxScore = rowCount * 4;
  final criteriaCount = template.synthesis.conversionCriteriaCount ?? rowCount;

  return convertRawScore(
    table: template.conversionTable,
    rawScore: totalScoreOn4,
    maxScore: maxScore,
    criteriaCount: criteriaCount,
  );
}
