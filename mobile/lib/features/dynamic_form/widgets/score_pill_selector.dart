import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Sélecteur de note 0 à 4 sous forme de "pilules" tactiles.
///
/// Grandes cibles tactiles (48dp min) et libellés numériques explicites —
/// pensé pour des utilisateurs peu familiers du numérique : pas de geste
/// (glisser/pincer), juste un tap direct sur le chiffre voulu.
class ScorePillSelector extends StatelessWidget {
  const ScorePillSelector({super.key, required this.value, required this.onChanged});

  /// null = pas encore noté.
  final int? value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var score = 0; score <= 4; score++) ...[
          if (score > 0) const SizedBox(width: 6),
          _Pill(score: score, selected: value == score, onTap: () => onChanged(score)),
        ],
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.score, required this.selected, required this.onTap});

  final int score;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = AppColors.forScore(score);
    return Semantics(
      button: true,
      selected: selected,
      label: 'Note $score sur 4',
      child: Material(
        color: selected ? color : AppColors.background,
        shape: const CircleBorder(side: BorderSide(color: AppColors.outline)),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Center(
              child: Text(
                '$score',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: selected ? Colors.white : AppColors.textMuted,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
