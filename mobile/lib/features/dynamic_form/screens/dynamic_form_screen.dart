import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/models/common.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../core/theme/app_colors.dart';
import '../state/dynamic_form_controller.dart';
import '../widgets/step_progress_indicator.dart';
import 'identification_step.dart';
import 'section_step.dart';
import 'synthesis_step.dart';

/// Écran générique de saisie d'un formulaire d'inspection IGE.
///
/// Reçoit l'identifiant du formulaire ([formCode] — C2, C3, C3B, C3M ou
/// C3_DAS) et, en le chargeant depuis `shared/forms/*.json` (embarqué en
/// asset), génère automatiquement toute l'interface de saisie : écran
/// d'identification, une étape par section notée, puis une synthèse
/// finale avec signatures. Le brouillon est auto-sauvegardé en local
/// (SQLite) à chaque modification — voir `DynamicFormController`.
class DynamicFormScreen extends StatelessWidget {
  const DynamicFormScreen({super.key, required this.formCode, this.draftId});

  /// Identifiant du formulaire. Accepte aussi bien le code officiel
  /// ("C3_DAS") que l'identifiant en minuscules ("c3_das").
  final FormCode formCode;

  /// Reprend un brouillon existant si fourni ; sinon reprend le dernier
  /// brouillon ouvert pour ce formulaire, ou en crée un nouveau.
  final String? draftId;

  /// Construit l'écran à partir de l'identifiant tel que décrit dans la
  /// spécification ("c2", "c3", "c3b", "c3m", "c3_das").
  factory DynamicFormScreen.forId(String formId, {String? draftId, Key? key}) {
    return DynamicFormScreen(key: key, formCode: FormCode.fromId(formId), draftId: draftId);
  }

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (context) => DynamicFormController(
        formCode: formCode,
        draftId: draftId,
        // Tente une synchronisation immédiate dès qu'une action est mise
        // en file (voir `SyncQueueRepository.enqueue`) — sans effet si
        // l'appareil est hors-ligne ou une synchronisation est déjà en
        // cours (voir `SyncEngine.triggerSync`).
        onQueueChanged: () => context.read<SyncEngine>().triggerSync(),
      ),
      child: const _DynamicFormView(),
    );
  }
}

class _DynamicFormView extends StatelessWidget {
  const _DynamicFormView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<DynamicFormController>();

    if (controller.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (controller.loadError != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erreur')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: Text(
              'Impossible de charger ce formulaire.\n${controller.loadError}',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    final (scored, possible) = controller.overallRawProgress;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 92,
        title: StepTitle(title: _stepTitle(controller), subtitle: controller.template.name),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(16),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: StepProgressIndicator(totalSteps: controller.totalSteps, currentStep: controller.stepIndex),
          ),
        ),
      ),
      body: SafeArea(top: false, child: _StepBody(controller: controller)),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CumulativeScoreBar(scored: scored, possible: possible),
              const SizedBox(height: 10),
              _NavButtons(controller: controller),
            ],
          ),
        ),
      ),
    );
  }

  String _stepTitle(DynamicFormController controller) {
    switch (controller.currentStep) {
      case DynamicFormStep.identification:
        return 'Identification';
      case DynamicFormStep.section:
        final section = controller.currentSection;
        return '${section.code}. ${section.title}';
      case DynamicFormStep.synthesis:
        return 'Synthèse & signatures';
    }
  }
}

class _StepBody extends StatelessWidget {
  const _StepBody({required this.controller});

  final DynamicFormController controller;

  @override
  Widget build(BuildContext context) {
    switch (controller.currentStep) {
      case DynamicFormStep.identification:
        return IdentificationStep(controller: controller);
      case DynamicFormStep.section:
        return SectionStep(
          key: ValueKey('section-${controller.currentSection.id}'),
          controller: controller,
          section: controller.currentSection,
        );
      case DynamicFormStep.synthesis:
        return SynthesisStep(controller: controller);
    }
  }
}

class _NavButtons extends StatelessWidget {
  const _NavButtons({required this.controller});

  final DynamicFormController controller;

  @override
  Widget build(BuildContext context) {
    final isLastStep = !controller.canGoNext;
    return Row(
      children: [
        if (controller.canGoPrevious)
          Expanded(
            child: OutlinedButton.icon(
              onPressed: controller.previousStep,
              icon: const Icon(Icons.arrow_back, size: 18),
              label: const Text('Précédent'),
            ),
          ),
        if (controller.canGoPrevious) const SizedBox(width: 12),
        Expanded(
          flex: controller.canGoPrevious ? 1 : 2,
          child: ElevatedButton.icon(
            onPressed: isLastStep ? () => _finish(context) : controller.nextStep,
            icon: Icon(isLastStep ? Icons.check_circle_outline : Icons.arrow_forward, size: 18),
            label: Text(isLastStep ? 'Terminer' : 'Suivant'),
            style: isLastStep
                ? ElevatedButton.styleFrom(backgroundColor: AppColors.positive)
                : null,
          ),
        ),
      ],
    );
  }

  Future<void> _finish(BuildContext context) async {
    await controller.markSubmitted();
    if (!context.mounted) return;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: const Icon(Icons.check_circle, color: AppColors.positive, size: 40),
        title: const Text('Formulaire enregistré'),
        content: const Text(
          'Le formulaire a été enregistré sur cet appareil. Il sera synchronisé '
          'avec le serveur dès qu\'une connexion sera disponible.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    if (context.mounted) {
      Navigator.of(context).pop();
    }
  }
}
