import 'package:flutter/material.dart';

import '../../../core/models/form_template.dart';
import '../state/dynamic_form_controller.dart';
import '../widgets/criterion_tile.dart';
import '../widgets/custom_observation_tile.dart';
import '../widgets/section_score_badge.dart';

/// Une étape de saisie : les critères officiels d'une section (note 0-4 +
/// observations), les observations personnalisées ajoutées par
/// l'inspecteur, et la zone "conseils" de la section.
class SectionStep extends StatefulWidget {
  const SectionStep({super.key, required this.controller, required this.section});

  final DynamicFormController controller;
  final FormSectionTemplate section;

  @override
  State<SectionStep> createState() => _SectionStepState();
}

class _SectionStepState extends State<SectionStep> {
  final Map<String, TextEditingController> _observationControllers = {};
  final Map<String, TextEditingController> _customLabelControllers = {};
  final Map<String, TextEditingController> _customNoteControllers = {};
  late final TextEditingController _adviceController;

  @override
  void initState() {
    super.initState();
    final draftSection = widget.controller.draft.sectionFor(widget.section.id);
    _adviceController = TextEditingController(text: draftSection.advice);
    for (final criterion in widget.section.criteria) {
      _observationControllers[criterion.id] = TextEditingController(
        text: draftSection.criteria[criterion.id]?.observation ?? '',
      );
    }
    for (final observation in draftSection.customObservations) {
      _customLabelControllers[observation.id] = TextEditingController(text: observation.label);
      _customNoteControllers[observation.id] = TextEditingController(text: observation.note);
    }
  }

  @override
  void dispose() {
    _adviceController.dispose();
    for (final controller in _observationControllers.values) {
      controller.dispose();
    }
    for (final controller in _customLabelControllers.values) {
      controller.dispose();
    }
    for (final controller in _customNoteControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  TextEditingController _cached(Map<String, TextEditingController> pool, String id, String initialText) {
    return pool.putIfAbsent(id, () => TextEditingController(text: initialText));
  }

  void _removeCustomObservation(String observationId) {
    widget.controller.removeCustomObservation(widget.section.id, observationId);
    _customLabelControllers.remove(observationId)?.dispose();
    _customNoteControllers.remove(observationId)?.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final section = widget.section;
    final draftSection = controller.draft.sectionFor(section.id);
    final scoreResult = controller.scoreForSection(section);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text('${section.code}  ${section.title}', style: Theme.of(context).textTheme.titleLarge),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SectionScoreBadge(result: scoreResult),
                const Divider(),
                for (final criterion in section.criteria)
                  CriterionTile(
                    criterion: criterion,
                    observationsLabel: section.observationsLabel,
                    score: draftSection.criteria[criterion.id]?.score,
                    observationController: _observationControllers[criterion.id]!,
                    onScoreChanged: (score) => controller.setCriterionScore(section.id, criterion.id, score),
                    onObservationChanged: (text) =>
                        controller.setCriterionObservation(section.id, criterion.id, text),
                  ),
              ],
            ),
          ),
        ),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Observations personnalisées', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 10),
                for (final observation in draftSection.customObservations)
                  CustomObservationTile(
                    labelController: _cached(_customLabelControllers, observation.id, observation.label),
                    noteController: _cached(_customNoteControllers, observation.id, observation.note),
                    onLabelChanged: (text) =>
                        controller.updateCustomObservation(section.id, observation.id, label: text),
                    onNoteChanged: (text) =>
                        controller.updateCustomObservation(section.id, observation.id, note: text),
                    onRemove: () => _removeCustomObservation(observation.id),
                  ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    onPressed: () => controller.addCustomObservation(section.id),
                    icon: const Icon(Icons.add_circle_outline, size: 18),
                    label: const Text('Ajouter une observation personnalisée'),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (section.adviceZone.enabled)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(section.adviceZone.label, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _adviceController,
                    minLines: 3,
                    maxLines: 6,
                    decoration: InputDecoration(hintText: section.adviceZone.placeholder),
                    onChanged: (text) => controller.setSectionAdvice(section.id, text),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
