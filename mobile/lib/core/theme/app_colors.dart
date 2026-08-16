import 'package:flutter/material.dart';

/// Palette officielle de l'application c3-digital. Toutes les couleurs
/// utilisées dans l'interface doivent venir d'ici — ne pas introduire de
/// couleurs ad hoc ailleurs dans le code.
class AppColors {
  const AppColors._();

  /// Bleu marine — couleur primaire (chrome, en-têtes, boutons principaux).
  static const Color primary = Color(0xFF1F4E78);

  /// Bleu — couleur d'accent (éléments interactifs secondaires).
  static const Color accent = Color(0xFF2E74B5);

  /// Vert — retour positif (mention "Elite"/"Très bon", validation).
  static const Color positive = Color(0xFF1E8E5A);

  /// Orange — attention (mention "Assez bon", avertissement non bloquant).
  static const Color warning = Color(0xFFC77700);

  /// Rouge — alerte (mention "Médiocre", erreur, suppression).
  static const Color danger = Color(0xFFC0392B);

  /// Fond de page sobre (gris très clair, pas de blanc pur pour limiter
  /// l'éblouissement sur les tablettes utilisées en extérieur).
  static const Color background = Color(0xFFF4F6F8);

  /// Fond des cartes.
  static const Color surface = Color(0xFFFFFFFF);

  /// Bordures / séparateurs discrets.
  static const Color outline = Color(0xFFD3DAE1);

  /// Texte secondaire (libellés d'aide, placeholders).
  static const Color textMuted = Color(0xFF5B6B79);

  /// Couleurs des 5 niveaux de note d'un critère (0 à 4), dans l'ordre —
  /// utilise chacune des 5 couleurs de la palette exactement une fois,
  /// du moins bon (rouge) au meilleur (vert).
  static const List<Color> scoreScale = [danger, warning, accent, primary, positive];

  static Color forScore(int score) => scoreScale[score.clamp(0, 4)];

  /// Couleur associée à une mention convertie sur 4 (ELITE/TRES BON/BON/
  /// ASSEZ BON/MEDIOCRE), en réutilisant [scoreScale].
  static Color forScoreOn4(int scoreOn4) => forScore(scoreOn4);
}
