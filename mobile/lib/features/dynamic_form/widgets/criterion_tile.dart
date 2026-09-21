import 'package:flutter/material.dart';

import '../../../core/models/form_template.dart';
import 'score_pill_selector.dart';

/// Une ligne de critère officiel : libellé + numérotation, sélecteur de
/// note 0-4, et champ "Observations" en texte libre.
class CriterionTile extends StatelessWidget {
  const CriterionTile({
    super.key,
    required this.criterion,
    required this.observationsLabel,
    required this.score,
    required this.observationController,
    required this.onScoreChanged,
    required this.onObservationChanged,
  });

  final FormCriterion criterion;
  final String observationsLabel;
  final int? score;
  final TextEditingController observationController;
  final ValueChanged<int> onScoreChanged;
  final ValueChanged<String> onObservationChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text.rich(
                  TextSpan(
                    children: [
                      if (criterion.code != null)
                        TextSpan(
                          text: '${criterion.code}  ',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      TextSpan(text: criterion.label),
                    ],
                  ),
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
              const SizedBox(width: 12),
              ScorePillSelector(value: score, onChanged: onScoreChanged),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: observationController,
            onChanged: onObservationChanged,
            minLines: 1,
            maxLines: 3,
            style: const TextStyle(fontSize: 13.5),
            decoration: InputDecoration(
              isDense: true,
              labelText: observationsLabel,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
        ],
      ),
    );
  }
}
