import 'package:c3_digital/core/db/app_database.dart';
import 'package:c3_digital/core/db/form_draft_repository.dart';
import 'package:c3_digital/core/models/common.dart';
import 'package:c3_digital/core/sync/sync_queue_repository.dart';
import 'package:c3_digital/features/dynamic_form/models/form_draft.dart';
import 'package:c3_digital/features/dynamic_form/state/dynamic_form_controller.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/sqflite_ffi_setup.dart';

/// Saisie complète des 5 formulaires en mode hors-ligne (PROMPT 9,
/// point 1) — pilote `DynamicFormController` (le même contrôleur que
/// `DynamicFormScreen`) de bout en bout pour chacun des 5 formulaires
/// IGE : identification -> toutes les sections notées -> synthèse, sans
/// aucun accès réseau (assets embarqués + SQLite local uniquement, via
/// `sqflite_common_ffi` — voir `test/support/sqflite_ffi_setup.dart`).
/// Vérifie la persistance locale du brouillon et son ajout à la file de
/// synchronisation, prête à être envoyée dès la reconnexion (voir
/// `sync_queue_repository_test.dart` pour la file elle-même, et
/// `backend/test/sync.e2e-spec.ts` côté serveur pour la synchronisation
/// et la gestion de conflit).
Future<void> _waitUntilLoaded(DynamicFormController controller) async {
  const timeout = Duration(seconds: 5);
  final deadline = DateTime.now().add(timeout);
  while (controller.isLoading) {
    if (DateTime.now().isAfter(deadline)) {
      throw StateError('DynamicFormController.isLoading est resté true au-delà de $timeout.');
    }
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
  if (controller.loadError != null) {
    throw controller.loadError!;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpSqfliteFfi();

  setUp(() async {
    await AppDatabase.reset();
  });

  tearDownAll(() async {
    await AppDatabase.reset();
  });

  for (final formCode in FormCode.values) {
    test('saisie complète hors-ligne du formulaire ${formCode.code}', () async {
      final controller = DynamicFormController(formCode: formCode);
      await _waitUntilLoaded(controller);

      expect(controller.currentStep, DynamicFormStep.identification);
      expect(controller.draft.status, DraftStatus.brouillon);

      controller.nextStep();

      for (final section in controller.template.sections) {
        expect(controller.currentStep, DynamicFormStep.section);
        expect(controller.currentSection.id, section.id);

        for (final criterion in section.criteria) {
          controller.setCriterionScore(section.id, criterion.id, 4);
        }

        controller.nextStep();
      }

      expect(controller.currentStep, DynamicFormStep.synthesis);
      expect(controller.stepIndex, controller.totalSteps - 1);

      // Note maximale sur tous les critères -> meilleure mention du barème.
      final bestBand = controller.template.conversionTable.bands.reduce(
        (a, b) => b.scoreOn4 > a.scoreOn4 ? b : a,
      );
      expect(controller.overallScore.mention, bestBand.mention);

      final (scored, possible) = controller.overallRawProgress;
      expect(scored, possible); // toutes les notes sont au maximum.

      await controller.markSubmitted();
      expect(controller.draft.status, DraftStatus.soumis);

      // --- Persistance locale (rien perdu hors-ligne) ---
      final persisted = await const FormDraftRepository().findById(controller.draft.id);
      expect(persisted, isNotNull);
      expect(persisted!.status, DraftStatus.soumis);
      final firstSection = controller.template.sections.first;
      final firstCriterion = firstSection.criteria.first;
      expect(persisted.sectionFor(firstSection.id).criteria[firstCriterion.id]?.score, 4);

      // --- File de synchronisation (prête pour l'envoi à la reconnexion) ---
      final queueEntries = await const SyncQueueRepository().forDraft(controller.draft.id);
      expect(queueEntries, isNotEmpty);

      controller.dispose();
    });
  }
}
