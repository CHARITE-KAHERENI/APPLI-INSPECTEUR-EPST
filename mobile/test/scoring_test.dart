import 'dart:convert';
import 'dart:io';

import 'package:c3_digital/core/models/form_template.dart';
import 'package:c3_digital/core/models/scoring.dart';
import 'package:flutter_test/flutter_test.dart';

FormTemplate _loadTemplate(String fileName) {
  final raw = File('assets/form-templates/$fileName').readAsStringSync();
  return FormTemplate.fromJson(jsonDecode(raw) as Map<String, dynamic>);
}

void main() {
  final c3 = _loadTemplate('c3.json');

  test('computeSectionScore matches the official conversion table boundaries (2.1 Personnalité, N=8)', () {
    final section = c3.sections.firstWhere((s) => s.code == '2.1');
    expect(section.criteria.length, 8);

    int scoreFor(int total) {
      var remaining = total;
      final scores = <String, int>{};
      for (final criterion in section.criteria) {
        final s = remaining.clamp(0, 4);
        scores[criterion.id] = s;
        remaining -= s;
      }
      final result = computeSectionScore(section: section, scores: scores, conversionTable: c3.conversionTable);
      return result.scoreOn4;
    }

    // Vérifie la valeur déduite par calcul (25-22) pour la case tronquée
    // à l'impression du tableau officiel — voir shared/README.md.
    expect(scoreFor(26), 4); // ELITE : 32-26
    expect(scoreFor(25), 3); // TRES BON : 25-22
    expect(scoreFor(22), 3);
    expect(scoreFor(21), 2); // BON : 21-16
    expect(scoreFor(15), 1); // ASSEZ BON : 15-13
    expect(scoreFor(0), 0); // MEDIOCRE
  });

  test('C3 has 56 critères across its 10 sections (8/5/5/7/4/3/5/6/9/4)', () {
    expect(c3.sections.map((s) => s.criteria.length).toList(), [8, 5, 5, 7, 4, 3, 5, 6, 9, 4]);
    expect(c3.sections.fold<int>(0, (sum, s) => sum + s.criteria.length), 56);
  });

  test('computeSynthesisScore combines all 10 section scoreOn4 via row N=10', () {
    final scores = <String, SectionScoreResult>{};
    for (final section in c3.sections) {
      // Note maximale sur chaque critère -> ELITE partout -> synthèse ELITE.
      final maxScores = {for (final c in section.criteria) c.id: 4};
      scores[section.id] = computeSectionScore(
        section: section,
        scores: maxScores,
        conversionTable: c3.conversionTable,
      );
    }
    final overall = computeSynthesisScore(template: c3, sectionScores: scores);
    expect(overall.scoreOn4, 4);
    expect(overall.mention, 'ELITE');
  });

  test('C2 uses percentage_only mode with a secondary mention vocabulary', () {
    final c2 = _loadTemplate('c2.json');
    expect(c2.conversionTable.mode, ConversionTableMode.percentageOnly);
    final eliteBand = c2.conversionTable.bands.firstWhere((b) => b.mention == 'ELITE');
    expect(eliteBand.secondaryMention, 'GRANDE DISTINCTION');
  });
}
