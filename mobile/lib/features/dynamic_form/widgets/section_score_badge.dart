import 'package:flutter/material.dart';

import '../../../core/models/scoring.dart';
import '../../../core/theme/app_colors.dart';

/// Petit badge affichant le score cumulé d'une section en temps réel :
/// "12/20 pts · 60% · BON". Couleur alignée sur la mention obtenue.
class SectionScoreBadge extends StatelessWidget {
  const SectionScoreBadge({super.key, required this.result});

  final SectionScoreResult result;

  @override
  Widget build(BuildContext context) {
    final color = AppColors.forScoreOn4(result.scoreOn4);
    final percentageLabel = result.percentage.toStringAsFixed(0);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${result.totalScore}/${result.maxScore} pts',
            style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12.5),
          ),
          const SizedBox(width: 6),
          Container(width: 1, height: 12, color: color.withOpacity(0.4)),
          const SizedBox(width: 6),
          Text('$percentageLabel%', style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12.5)),
          const SizedBox(width: 6),
          Container(width: 1, height: 12, color: color.withOpacity(0.4)),
          const SizedBox(width: 6),
          Text(
            result.mention,
            style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5),
          ),
        ],
      ),
    );
  }
}
