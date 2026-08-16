import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Barre de progression en segments, un par étape (identification,
/// sections, synthèse) — donne un repère visuel simple de l'avancement,
/// sans exiger de compréhension d'un numéro d'étape.
class StepProgressIndicator extends StatelessWidget {
  const StepProgressIndicator({super.key, required this.totalSteps, required this.currentStep});

  final int totalSteps;
  final int currentStep;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < totalSteps; i++) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(
            child: Container(
              height: 5,
              decoration: BoxDecoration(
                color: i <= currentStep ? Colors.white : Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Titre + sous-titre de l'étape courante, affiché sous la barre de
/// progression dans l'AppBar.
class StepTitle extends StatelessWidget {
  const StepTitle({super.key, required this.title, this.subtitle});

  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
        if (subtitle != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(subtitle!, style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 12.5)),
          ),
      ],
    );
  }
}

/// Barre persistante en bas de l'écran indiquant le score cumulé de
/// l'ensemble du formulaire, mise à jour en temps réel.
class CumulativeScoreBar extends StatelessWidget {
  const CumulativeScoreBar({super.key, required this.scored, required this.possible});

  final int scored;
  final int possible;

  @override
  Widget build(BuildContext context) {
    final percentage = possible == 0 ? 0.0 : scored / possible;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Row(
        children: [
          const Icon(Icons.bar_chart_rounded, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Score cumulé : $scored / $possible pts',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: percentage,
                    minHeight: 6,
                    backgroundColor: Colors.white.withOpacity(0.25),
                    valueColor: const AlwaysStoppedAnimation(AppColors.positive),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
