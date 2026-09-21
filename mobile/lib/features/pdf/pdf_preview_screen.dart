import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

import '../../core/models/form_template.dart';
import '../../core/pdf/pdf_generator.dart';
import '../../core/theme/app_colors.dart';
import '../dynamic_form/models/form_draft.dart';

/// Aperçu du PDF généré localement (hors-ligne) pour un formulaire rempli.
///
/// `PdfPreview` (package `printing`) affiche le rendu, et propose
/// partage/impression/export sans connexion requise — la génération
/// elle-même (`InspectionPdfGenerator`) ne fait aucun appel réseau.
class PdfPreviewScreen extends StatelessWidget {
  const PdfPreviewScreen({super.key, required this.template, required this.draft});

  final FormTemplate template;
  final FormDraft draft;

  @override
  Widget build(BuildContext context) {
    final reportNumber = draft.header['numero_rapport'];
    final fileNameSuffix = (reportNumber is String && reportNumber.isNotEmpty) ? reportNumber : draft.id;
    final fileName = '${template.code.code}-$fileNameSuffix.pdf'.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');

    return Scaffold(
      appBar: AppBar(
        title: Text('PDF — ${template.name}'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: PdfPreview(
        build: (format) => const InspectionPdfGenerator().generate(template: template, draft: draft),
        pdfFileName: fileName,
        canChangePageFormat: false,
        canChangeOrientation: false,
        canDebug: false,
      ),
    );
  }
}
