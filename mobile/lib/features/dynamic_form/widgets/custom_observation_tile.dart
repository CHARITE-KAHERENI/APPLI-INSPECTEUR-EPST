import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Une observation personnalisée ajoutée par l'inspecteur — délibérément
/// distincte visuellement des critères officiels (fond teinté, bordure en
/// tirets, icône dédiée) pour qu'on ne puisse jamais la confondre avec le
/// référentiel IGE.
class CustomObservationTile extends StatelessWidget {
  const CustomObservationTile({
    super.key,
    required this.labelController,
    required this.noteController,
    required this.onLabelChanged,
    required this.onNoteChanged,
    required this.onRemove,
  });

  final TextEditingController labelController;
  final TextEditingController noteController;
  final ValueChanged<String> onLabelChanged;
  final ValueChanged<String> onNoteChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.accent.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.accent.withOpacity(0.5), style: BorderStyle.solid),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.push_pin_outlined, size: 16, color: AppColors.accent),
              const SizedBox(width: 6),
              const Expanded(
                child: Text(
                  'Observation personnalisée',
                  style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.w700, fontSize: 12.5),
                ),
              ),
              IconButton(
                onPressed: onRemove,
                icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.danger),
                tooltip: 'Supprimer cette observation',
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 6),
          TextField(
            controller: labelController,
            onChanged: onLabelChanged,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
            decoration: const InputDecoration(
              isDense: true,
              labelText: 'Titre',
              hintText: 'Ex : Éclairage de la salle',
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: noteController,
            onChanged: onNoteChanged,
            minLines: 1,
            maxLines: 4,
            style: const TextStyle(fontSize: 13.5),
            decoration: const InputDecoration(isDense: true, labelText: 'Note'),
          ),
        ],
      ),
    );
  }
}
