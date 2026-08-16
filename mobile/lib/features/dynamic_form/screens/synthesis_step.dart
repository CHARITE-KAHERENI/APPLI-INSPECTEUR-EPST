import 'package:flutter/material.dart';

import '../../../core/models/scoring.dart';
import '../../../core/theme/app_colors.dart';
import '../state/dynamic_form_controller.dart';
import '../widgets/signature_pad_field.dart';

/// Écran de synthèse finale : récapitulatif des scores par section, score
/// total / pourcentage / mention, et zone de signature pour chacun des
/// signataires attendus par le formulaire (enseignant, chef
/// d'établissement, inspecteur — variable selon le formulaire).
class SynthesisStep extends StatelessWidget {
  const SynthesisStep({super.key, required this.controller});

  final DynamicFormController controller;

  @override
  Widget build(BuildContext context) {
    final template = controller.template;
    final sectionScores = controller.allSectionScores;
    final overall = controller.overallScore;
    final overallColor = AppColors.forScoreOn4(overall.scoreOn4);

    final sortedRoles = [...template.signatures.roles]..sort((a, b) => a.order.compareTo(b.order));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(template.synthesis.title, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                for (final row in template.synthesis.rows)
                  _SynthesisRow(label: row.label, result: sectionScores[row.sectionId]),
              ],
            ),
          ),
        ),
        Card(
          color: overallColor.withOpacity(0.08),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  template.synthesis.finalMentionLabel,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(color: overallColor),
                ),
                if (template.synthesis.finalMentionHelpText != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    template.synthesis.finalMentionHelpText!,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      overall.mention,
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: overallColor),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      '${overall.percentage.toStringAsFixed(0)}%',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: overallColor),
                    ),
                  ],
                ),
                if (template.synthesis.sealLabel != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.approval_outlined, size: 18, color: AppColors.textMuted),
                      const SizedBox(width: 6),
                      Text(template.synthesis.sealLabel!, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ],
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
                Text('Signatures', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                for (final role in sortedRoles) ...[
                  SignaturePadField(
                    label: role.label,
                    existingPngBase64: controller.draft.signatureFor(role.role).pngBase64,
                    onSigned: (pngBase64) => controller.setSignature(role.role, pngBase64),
                    onCleared: () => controller.clearSignature(role.role),
                  ),
                  const SizedBox(height: 16),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _SynthesisRow extends StatelessWidget {
  const _SynthesisRow({required this.label, required this.result});

  final String label;
  final SectionScoreResult? result;

  @override
  Widget build(BuildContext context) {
    final scoreOn4 = result?.scoreOn4 ?? 0;
    final mention = result?.mention ?? '—';
    final color = AppColors.forScoreOn4(scoreOn4);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: color),
            ),
            child: Text(
              '$scoreOn4/4 · $mention',
              style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
