import 'package:pdf/pdf.dart';

import '../theme/app_colors.dart';

/// Conversion de la palette officielle c3-digital (`AppColors`, Flutter)
/// vers `PdfColor` (package `pdf`), pour que le PDF généré localement sur
/// mobile utilise exactement les mêmes couleurs que l'application et que
/// le PDF généré côté serveur — voir
/// `backend/src/modules/pdf/pdf-template.service.ts` (`COLORS`).
///
/// Nommée `AppPdfColors` (et non `PdfColors`) pour ne pas entrer en
/// conflit avec la classe `PdfColors` exportée par `package:pdf/pdf.dart`
/// (couleurs nommées prédéfinies du package).
class AppPdfColors {
  AppPdfColors._();

  static final primary = PdfColor.fromInt(AppColors.primary.value);
  static final accent = PdfColor.fromInt(AppColors.accent.value);
  static final positive = PdfColor.fromInt(AppColors.positive.value);
  static final warning = PdfColor.fromInt(AppColors.warning.value);
  static final danger = PdfColor.fromInt(AppColors.danger.value);
  static final outline = PdfColor.fromInt(AppColors.outline.value);
  static final textMuted = PdfColor.fromInt(AppColors.textMuted.value);
  static final background = PdfColor.fromInt(AppColors.background.value);

  /// Note 0-4 -> couleur, même échelle que `AppColors.scoreScale`.
  static final List<PdfColor> scoreScale = [danger, warning, accent, primary, positive];

  static PdfColor forScore(int score) => scoreScale[score.clamp(0, 4)];
}
