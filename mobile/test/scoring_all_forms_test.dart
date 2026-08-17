import 'dart:convert';
import 'dart:io';

import 'package:c3_digital/core/models/form_template.dart';
import 'package:c3_digital/core/models/scoring.dart';
import 'package:flutter_test/flutter_test.dart';

/// Calcul des scores et mentions pour les 5 formulaires officiels
/// (PROMPT 9, point 1) — complète `scoring_test.dart` (C3/C2 uniquement)
/// avec les 5 formulaires, sur le même modèle que
/// `backend/src/modules/form-submissions/scoring.spec.ts` : la note
/// maximale sur toutes les sections doit toujours produire la meilleure
/// mention du barème du formulaire, quel que soit son mode de conversion
/// (`lookup_by_criteria_count` ou `percentage_only`).
const _formFiles = ['c2.json', 'c3.json', 'c3b.json', 'c3m.json', 'c3_das.json'];

FormTemplate _loadTemplate(String fileName) {
  final raw = File('assets/form-templates/$fileName').readAsStringSync();
  return FormTemplate.fromJson(jsonDecode(raw) as Map<String, dynamic>);
}

void main() {
  for (final fileName in _formFiles) {
    final template = _loadTemplate(fileName);

    group('Calcul des scores — $fileName', () {
      test('au moins une section et un critère (formulaire non vide)', () {
        expect(template.sections, isNotEmpty);
        for (final section in template.sections) {
          expect(section.criteria, isNotEmpty, reason: 'Section ${section.id} sans critère');
        }
      });

      test('note maximale (4) sur tous les critères de toutes les sections -> meilleure mention du barème', () {
        final sectionScores = <String, SectionScoreResult>{};
        for (final section in template.sections) {
          final scores = {for (final c in section.criteria) c.id: 4};
          final result = computeSectionScore(section: section, scores: scores, conversionTable: template.conversionTable);
          expect(result.percentage, 100, reason: 'Section ${section.id}');
          sectionScores[section.id] = result;
        }

        final overall = computeSynthesisScore(template: template, sectionScores: sectionScores);
        final bestBand = template.conversionTable.bands.reduce((a, b) => b.scoreOn4 > a.scoreOn4 ? b : a);
        expect(overall.scoreOn4, bestBand.scoreOn4);
        expect(overall.mention, bestBand.mention);
      });

      test('un critère non noté compte pour 0 (score en temps réel pendant la saisie)', () {
        final section = template.sections.first;
        final result = computeSectionScore(section: section, scores: const {}, conversionTable: template.conversionTable);
        expect(result.totalScore, 0);
        expect(result.answeredCount, 0);
        expect(result.isComplete, isFalse);
      });
    });
  }
}
