import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../features/dynamic_form/models/form_draft.dart';
import '../models/common.dart';
import '../models/form_template.dart';
import '../models/scoring.dart';
import 'pdf_colors.dart';

/// Génère localement (hors-ligne) le PDF d'un formulaire rempli, à partir
/// du même modèle de données que l'écran de saisie (`FormTemplate` +
/// `FormDraft`) — équivalent mobile de
/// `backend/src/modules/pdf/pdf-template.service.ts`.
///
/// Reproduit la même structure de contenu que la version serveur (en-tête
/// RDC/ministère/logo, bloc d'identification, grille d'évaluation par
/// section, tableau de conversion + évaluation synthétique, signatures,
/// observations complémentaires) avec une mise en page volontairement
/// plus simple (une seule colonne d'identification plutôt que 4 zones
/// juxtaposées) : le package `pdf` ne permet pas de vérifier visuellement
/// le rendu sans SDK Flutter dans cet environnement de développement, une
/// mise en page plus simple réduit donc le risque d'erreur non détectée.
/// Le contenu — ce que la fidélité aux documents officiels exige avant
/// tout — reste complet et identique.
class InspectionPdfGenerator {
  const InspectionPdfGenerator();

  static const _country = 'REPUBLIQUE DEMOCRATIQUE DU CONGO';
  static const _ministry = "Ministère de l'Education Nationale et Nouvelle Citoyenneté";
  static const _service = 'INSPECTION GENERALE';
  static const _logoAssetPath = 'assets/branding/ige_logo.png';

  Future<Uint8List> generate({required FormTemplate template, required FormDraft draft}) async {
    final logoBytes = (await rootBundle.load(_logoAssetPath)).buffer.asUint8List();
    final logoImage = pw.MemoryImage(logoBytes);

    final sectionScores = <String, SectionScoreResult>{
      for (final section in template.sections) section.id: _scoreForSection(template, draft, section),
    };

    final doc = pw.Document();
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(24, 24, 24, 30),
        maxPages: 80,
        footer: (context) => pw.Container(
          alignment: pw.Alignment.center,
          margin: const pw.EdgeInsets.only(top: 6),
          child: pw.Text(
            'c3-digital — Page ${context.pageNumber} / ${context.pagesCount}',
            style: pw.TextStyle(fontSize: 7, color: AppPdfColors.textMuted),
          ),
        ),
        build: (context) => [
          _buildLetterhead(template, draft, logoImage),
          pw.SizedBox(height: 6),
          _buildBigTitle(template),
          pw.SizedBox(height: 6),
          ..._buildBodyBlocks(template, draft, sectionScores),
          pw.SizedBox(height: 6),
          _buildSynthesisAndConversion(template, sectionScores),
          pw.SizedBox(height: 6),
          _buildSignatures(template, draft),
          ..._buildCustomObservations(template, draft),
        ],
      ),
    );

    return doc.save();
  }

  // ---------------------------------------------------------------------
  // Scores
  // ---------------------------------------------------------------------

  SectionScoreResult _scoreForSection(FormTemplate template, FormDraft draft, FormSectionTemplate section) {
    final sectionDraft = draft.sectionFor(section.id);
    final scores = <String, int>{
      for (final entry in sectionDraft.criteria.entries)
        if (entry.value.score != null) entry.key: entry.value.score!,
    };
    return computeSectionScore(section: section, scores: scores, conversionTable: template.conversionTable);
  }

  // ---------------------------------------------------------------------
  // En-tête (lettre à en-tête RDC/ministère/logo + identification)
  // ---------------------------------------------------------------------

  pw.Widget _buildLetterhead(FormTemplate template, FormDraft draft, pw.MemoryImage logoImage) {
    final fields = [...template.header.fields]..sort((a, b) => a.order.compareTo(b.order));

    final rows = <pw.TableRow>[];
    for (final field in fields) {
      final value = draft.header[field.key];
      rows.add(
        pw.TableRow(
          children: [
            _identificationLabelCell(field.code != null ? '${field.code}. ${field.label}' : field.label),
            _identificationValueCell(_formatFieldValue(field, value)),
          ],
        ),
      );
    }

    final identificationTable = pw.Table(
      columnWidths: {0: const pw.FlexColumnWidth(2), 1: const pw.FlexColumnWidth(3)},
      border: null,
      children: rows,
    );

    return pw.Container(
      decoration: pw.BoxDecoration(border: pw.Border.all(width: 1.2)),
      padding: const pw.EdgeInsets.all(6),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.SizedBox(
                width: 130,
                child: pw.Text(
                  _country,
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
                ),
              ),
              pw.SizedBox(height: 2),
              pw.SizedBox(
                width: 130,
                child: pw.Text(
                  _ministry,
                  textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8),
                ),
              ),
              pw.SizedBox(height: 4),
              pw.Image(logoImage, width: 55),
              pw.SizedBox(height: 4),
              pw.Text(_service, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
            ],
          ),
          pw.SizedBox(width: 8),
          pw.Expanded(child: identificationTable),
          pw.SizedBox(width: 8),
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(
                template.code.code,
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 26, color: AppPdfColors.primary),
              ),
              pw.SizedBox(height: 4),
              pw.Container(
                padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: pw.BoxDecoration(color: AppPdfColors.accent, borderRadius: pw.BorderRadius.circular(8)),
                child: pw.Text(
                  _statusLabel(draft.status),
                  style: pw.TextStyle(color: PdfColors.white, fontSize: 7, fontWeight: pw.FontWeight.bold),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  pw.Widget _identificationLabelCell(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1.5, horizontal: 3),
      child: pw.Text(text, style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
    );
  }

  pw.Widget _identificationValueCell(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 1.5, horizontal: 3),
      child: pw.Text(text, style: const pw.TextStyle(fontSize: 8)),
    );
  }

  String _formatFieldValue(FormHeaderField field, dynamic value) {
    if (field.type == FormFieldType.select) {
      final options = field.options ?? const [];
      FieldOption? chosen;
      for (final option in options) {
        if (option.value == value) {
          chosen = option;
          break;
        }
      }
      final scale = options.map((o) => o.label).join(' / ');
      return chosen != null ? '${chosen.label}  (${scale})' : '—  (${scale})';
    }
    if (value == null || value == '') {
      return '—';
    }
    return value.toString();
  }

  String _statusLabel(DraftStatus status) {
    switch (status) {
      case DraftStatus.brouillon:
        return 'BROUILLON';
      case DraftStatus.soumis:
        return 'SOUMIS';
      case DraftStatus.synchronise:
        return 'SYNCHRONISE';
    }
  }

  pw.Widget _buildBigTitle(FormTemplate template) {
    final prefix = '${template.code.code} - ';
    final title = template.name.startsWith(prefix) ? template.name.substring(prefix.length) : template.name;
    return pw.Container(
      width: double.infinity,
      alignment: pw.Alignment.center,
      padding: const pw.EdgeInsets.all(5),
      decoration: pw.BoxDecoration(border: pw.Border.all(width: 1.2)),
      child: pw.Text(
        title.toUpperCase(),
        textAlign: pw.TextAlign.center,
        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Groupes de champs + sections, interclassés par code officiel (même
  // logique que `PdfTemplateService` côté backend : par ex. pour C2, les
  // groupes "1", "2.1", "3.1" s'intercalent avec les sections "2.2",
  // "3.2", "4.1" dans l'ordre exact du document officiel).
  // ---------------------------------------------------------------------

  List<pw.Widget> _buildBodyBlocks(
    FormTemplate template,
    FormDraft draft,
    Map<String, SectionScoreResult> sectionScores,
  ) {
    final blocks = <_CodedBlock>[
      for (final group in template.fieldGroups) _CodedBlock(group.code, [_buildFieldGroup(group, draft)]),
      for (final section in template.sections)
        _CodedBlock(section.code, _buildSection(section, draft, sectionScores[section.id])),
    ];
    blocks.sort((a, b) => _compareCodes(a.code, b.code));
    return [
      for (final block in blocks) ...[...block.widgets, pw.SizedBox(height: 6)],
    ];
  }

  int _compareCodes(String? a, String? b) {
    final pa = _parseCode(a);
    final pb = _parseCode(b);
    final len = pa.length > pb.length ? pa.length : pb.length;
    for (var i = 0; i < len; i++) {
      final va = i < pa.length ? pa[i] : 0;
      final vb = i < pb.length ? pb[i] : 0;
      if (va != vb) return va - vb;
    }
    return 0;
  }

  List<int> _parseCode(String? code) {
    if (code == null || code.isEmpty) return const [0];
    return code.split('.').map((p) => int.tryParse(p) ?? 0).toList();
  }

  pw.Widget _buildFieldGroup(FormFieldGroup group, FormDraft draft) {
    final shortFields = group.fields.where((f) => f.type != FormFieldType.textarea).toList();
    final longFields = group.fields.where((f) => f.type == FormFieldType.textarea).toList();

    final children = <pw.Widget>[
      pw.Text(
        group.code != null ? '${group.code}. ${group.title}' : group.title,
        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
      ),
      if (group.description != null) ...[
        pw.SizedBox(height: 2),
        pw.Text(group.description!, style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic)),
      ],
      pw.SizedBox(height: 3),
    ];

    if (shortFields.isNotEmpty) {
      children.add(
        pw.TableHelper.fromTextArray(
          headers: [for (final f in shortFields) f.label],
          data: [
            [for (final f in shortFields) _formatFieldValue(f, draft.header[f.key])],
          ],
          headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8),
          cellStyle: const pw.TextStyle(fontSize: 8),
          cellAlignment: pw.Alignment.center,
          headerAlignment: pw.Alignment.center,
          border: pw.TableBorder.all(width: 0.6, color: AppPdfColors.outline),
          cellPadding: const pw.EdgeInsets.symmetric(vertical: 3, horizontal: 3),
        ),
      );
    }

    for (final field in longFields) {
      final value = draft.header[field.key];
      children.addAll([
        pw.SizedBox(height: 3),
        pw.Text(field.label, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
        pw.Container(
          width: double.infinity,
          margin: const pw.EdgeInsets.only(top: 1),
          padding: const pw.EdgeInsets.all(4),
          decoration: pw.BoxDecoration(border: pw.Border.all(width: 0.6, color: AppPdfColors.outline)),
          child: pw.Text((value == null || value == '') ? '—' : value.toString(), style: const pw.TextStyle(fontSize: 8)),
        ),
      ]);
    }

    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(5),
      decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
      child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: children),
    );
  }

  // ---------------------------------------------------------------------
  // Sections notées (grille d'évaluation)
  // ---------------------------------------------------------------------

  List<pw.Widget> _buildSection(FormSectionTemplate section, FormDraft draft, SectionScoreResult? score) {
    final sectionDraft = draft.sectionFor(section.id);

    final headerRow = pw.TableRow(
      repeat: true,
      decoration: const pw.BoxDecoration(color: PdfColors.grey300),
      children: [
        _gridHeaderCell('Code'),
        _gridHeaderCell('Critère'),
        _gridHeaderCell(section.observationsLabel),
        _gridHeaderCell('0-4'),
      ],
    );

    final criteriaRows = <pw.TableRow>[headerRow];
    for (final criterion in section.criteria) {
      final answer = sectionDraft.criteria[criterion.id];
      final scoreValue = answer?.score;
      criteriaRows.add(
        pw.TableRow(
          children: [
            _gridCell(criterion.code ?? '', italic: true, align: pw.TextAlign.center),
            _gridCell(criterion.label, italic: true),
            _gridCell(answer?.observation ?? ''),
            _gridScoreCell(scoreValue),
          ],
        ),
      );
    }

    final table = pw.Table(
      border: pw.TableBorder.all(width: 0.6, color: AppPdfColors.outline),
      columnWidths: {
        0: const pw.FixedColumnWidth(28),
        1: const pw.FlexColumnWidth(3),
        2: const pw.FlexColumnWidth(4),
        3: const pw.FixedColumnWidth(28),
      },
      children: criteriaRows,
    );

    final totalLabel =
        '← Conversion : ${score?.mention ?? '—'}'
        '${score != null ? ' (${score.percentage.toStringAsFixed(0)}%)' : ''}'
        '   —   Total → ${score?.totalScore ?? 0} / ${score?.maxScore ?? 0}';

    // Widgets retournés à PLAT (liste), pas regroupés dans un `pw.Column`
    // ni un `pw.Container` : une section peut dépasser une page (ex: C2,
    // jusqu'à ~40 critères sur une seule section), et seul `table` (un
    // vrai `pw.Table`, seul widget ici capable de scinder ses LIGNES
    // entre plusieurs pages) doit porter cette pagination. L'imbriquer
    // dans un `Column`/`Container` qui doit lui-même tenir en entier sur
    // une page revient à demander au moteur de mise en page de faire
    // tenir un bloc plus grand qu'une page sur une page : il retente
    // indéfiniment sur de nouvelles pages sans jamais y parvenir
    // (`PdfTooBigPageException`, même en relevant largement `maxPages`).
    return [
      pw.Text('${section.code}. ${section.title}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
      if (section.description != null)
        pw.Text(section.description!, style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic)),
      pw.SizedBox(height: 3),
      table,
      pw.SizedBox(height: 3),
      pw.Align(
        alignment: pw.Alignment.centerRight,
        child: pw.Text(totalLabel, style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold)),
      ),
      if (section.adviceZone.enabled) ...[
        pw.SizedBox(height: 3),
        pw.Text(section.adviceZone.label, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8)),
        pw.Container(
          width: double.infinity,
          margin: const pw.EdgeInsets.only(top: 1),
          padding: const pw.EdgeInsets.all(4),
          decoration: pw.BoxDecoration(border: pw.Border.all(width: 0.6, color: AppPdfColors.outline)),
          child: pw.Text(
            sectionDraft.advice.isEmpty ? '—' : sectionDraft.advice,
            style: const pw.TextStyle(fontSize: 8),
          ),
        ),
      ],
    ];
  }

  pw.Widget _gridHeaderCell(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 3),
      child: pw.Text(
        text,
        textAlign: pw.TextAlign.center,
        style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 7.5),
      ),
    );
  }

  pw.Widget _gridCell(String text, {bool italic = false, pw.TextAlign align = pw.TextAlign.left}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 3),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(fontSize: 7.5, fontStyle: italic ? pw.FontStyle.italic : pw.FontStyle.normal),
      ),
    );
  }

  pw.Widget _gridScoreCell(int? score) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 3),
      child: pw.Text(
        score?.toString() ?? '—',
        textAlign: pw.TextAlign.center,
        style: pw.TextStyle(
          fontSize: 8,
          fontWeight: pw.FontWeight.bold,
          color: score != null ? AppPdfColors.forScore(score) : AppPdfColors.textMuted,
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Evaluation synthétique + tableau de conversion
  // ---------------------------------------------------------------------

  pw.Widget _buildSynthesisAndConversion(FormTemplate template, Map<String, SectionScoreResult> sectionScores) {
    final synthesis = template.synthesis;

    ConversionResult? finalResult;
    try {
      finalResult = computeSynthesisScore(template: template, sectionScores: sectionScores);
    } catch (_) {
      finalResult = null;
    }

    final synthesisTable = pw.TableHelper.fromTextArray(
      headers: [synthesis.title, 'Note/4'],
      data: [
        for (final row in synthesis.rows)
          [row.label, sectionScores[row.sectionId]?.scoreOn4?.toString() ?? '—'],
      ],
      headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 8),
      cellStyle: const pw.TextStyle(fontSize: 7.5),
      cellAlignments: {1: pw.Alignment.center},
      border: pw.TableBorder.all(width: 0.6, color: AppPdfColors.outline),
      cellPadding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 3),
    );

    final finalColor = finalResult != null ? AppPdfColors.forScore(finalResult.scoreOn4) : AppPdfColors.textMuted;

    return pw.Row(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Expanded(
          flex: 2,
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              synthesisTable,
              pw.SizedBox(height: 6),
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(5),
                decoration: pw.BoxDecoration(border: pw.Border(top: pw.BorderSide(width: 1.4))),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(synthesis.finalMentionLabel, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 11)),
                    if (synthesis.finalMentionHelpText != null)
                      pw.Text(
                        synthesis.finalMentionHelpText!,
                        style: pw.TextStyle(fontSize: 7, color: AppPdfColors.textMuted),
                      ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      finalResult != null
                          ? '${finalResult.mention}  (${finalResult.percentage.toStringAsFixed(0)}%)'
                          : '—',
                      style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 14, color: finalColor),
                    ),
                    if (synthesis.sealLabel != null) ...[
                      pw.SizedBox(height: 6),
                      pw.Container(
                        width: double.infinity,
                        alignment: pw.Alignment.center,
                        padding: const pw.EdgeInsets.symmetric(vertical: 10),
                        decoration: pw.BoxDecoration(
                          border: pw.Border.all(width: 0.6, color: AppPdfColors.outline, style: pw.BorderStyle.dashed),
                        ),
                        child: pw.Text(
                          synthesis.sealLabel!,
                          style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: AppPdfColors.textMuted),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        pw.SizedBox(width: 8),
        pw.Expanded(flex: 3, child: _buildConversionTable(template.conversionTable)),
      ],
    );
  }

  pw.Widget _buildConversionTable(ConversionTable table) {
    final title = pw.Text('Tableau de conversion', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 9));

    if (table.mode == ConversionTableMode.percentageOnly) {
      final hasSecondary = table.bands.any((b) => b.secondaryMention != null);
      final grid = pw.TableHelper.fromTextArray(
        headers: ['Note/4', '%', 'Mention', if (hasSecondary) 'Appréciation globale'],
        data: [
          for (final band in table.bands)
            [
              band.scoreOn4.toString(),
              '${_formatPercent(band.minPercentage)} – ${_formatPercent(band.maxPercentage)}',
              band.mention,
              if (hasSecondary) band.secondaryMention ?? '',
            ],
        ],
        headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 7),
        cellStyle: const pw.TextStyle(fontSize: 7),
        cellAlignment: pw.Alignment.center,
        headerAlignment: pw.Alignment.center,
        border: pw.TableBorder.all(width: 0.6, color: AppPdfColors.outline),
        cellPadding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 2),
      );
      return pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [title, pw.SizedBox(height: 3), grid]);
    }

    final rows = [...(table.rows ?? const <ConversionTableRow>[])]
      ..sort((a, b) => a.criteriaCount.compareTo(b.criteriaCount));

    final headers = ['NOTE', for (final band in table.bands) band.scoreOn4.toString()];
    final data = <List<String>>[
      ['%', for (final band in table.bands) '${_formatPercent(band.minPercentage)} – ${_formatPercent(band.maxPercentage)}'],
      for (final row in rows)
        [row.criteriaCount.toString(), for (final range in row.ranges) '${range.min} – ${range.max}'],
      ['MENTION', for (final band in table.bands) band.mention],
    ];

    final grid = pw.TableHelper.fromTextArray(
      headers: headers,
      data: data,
      headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 7),
      cellStyle: const pw.TextStyle(fontSize: 7),
      cellAlignment: pw.Alignment.center,
      headerAlignment: pw.Alignment.center,
      border: pw.TableBorder.all(width: 0.6, color: AppPdfColors.outline),
      cellPadding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 2),
    );

    return pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [title, pw.SizedBox(height: 3), grid]);
  }

  // ---------------------------------------------------------------------
  // Signatures
  // ---------------------------------------------------------------------

  pw.Widget _buildSignatures(FormTemplate template, FormDraft draft) {
    final roles = [...template.signatures.roles]..sort((a, b) => a.order.compareTo(b.order));

    return pw.Container(
      width: double.infinity,
      padding: const pw.EdgeInsets.all(5),
      decoration: pw.BoxDecoration(border: pw.Border.all(width: 1)),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text('Signatures', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
          pw.SizedBox(height: 4),
          for (final roleTemplate in roles) _signatureBlock(roleTemplate, draft.signatureFor(roleTemplate.role)),
        ],
      ),
    );
  }

  pw.Widget _signatureBlock(SignatureRoleTemplate roleTemplate, SignatureDraft signature) {
    final place = (signature.place == null || signature.place!.isEmpty) ? '.........................' : signature.place!;
    final date = signature.signedAt != null ? _formatDate(signature.signedAt!) : '..... / ..... / ..........';
    final name = (signature.signedByName == null || signature.signedByName!.isEmpty)
        ? '.........................'
        : signature.signedByName!;

    Uint8List? pngBytes;
    if (signature.pngBase64 != null && signature.pngBase64!.isNotEmpty) {
      try {
        pngBytes = base64Decode(signature.pngBase64!);
      } catch (_) {
        pngBytes = null;
      }
    }

    return pw.Container(
      width: double.infinity,
      margin: const pw.EdgeInsets.only(bottom: 6),
      padding: const pw.EdgeInsets.only(top: 4),
      decoration: pw.BoxDecoration(border: pw.Border(top: pw.BorderSide(width: 0.6, color: AppPdfColors.outline))),
      child: pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Text(
            roleTemplate.label,
            style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontStyle: pw.FontStyle.italic, fontSize: 8.5),
          ),
          pw.SizedBox(height: 2),
          pw.Text('Fait à $place, le $date', style: const pw.TextStyle(fontSize: 8)),
          pw.Text('Nom : $name', style: const pw.TextStyle(fontSize: 8)),
          if (pngBytes != null)
            pw.Container(
              margin: const pw.EdgeInsets.only(top: 3),
              height: 32,
              child: pw.Image(pw.MemoryImage(pngBytes), fit: pw.BoxFit.contain, alignment: pw.Alignment.centerLeft),
            )
          else
            pw.Padding(
              padding: const pw.EdgeInsets.only(top: 3),
              child: pw.Text(
                '(non signé)',
                style: pw.TextStyle(fontSize: 8, fontStyle: pw.FontStyle.italic, color: AppPdfColors.textMuted),
              ),
            ),
        ],
      ),
    );
  }

  /// Affiche un pourcentage sans décimale superflue si la valeur est
  /// entière, mais préserve les décimales significatives sinon (ex:
  /// `39.99`, une borne volontairement non-entière du tableau de
  /// conversion officiel — l'arrondir à `40` la ferait chevaucher la
  /// bande suivante). Cohérent avec l'affichage backend (qui interpole
  /// les nombres tels quels, sans arrondi).
  String _formatPercent(double value) {
    if (value == value.roundToDouble()) {
      return value.toInt().toString();
    }
    var text = value.toStringAsFixed(2);
    while (text.endsWith('0')) {
      text = text.substring(0, text.length - 1);
    }
    if (text.endsWith('.')) {
      text = text.substring(0, text.length - 1);
    }
    return text;
  }

  String _formatDate(DateTime date) {
    final local = date.toLocal();
    final d = local.day.toString().padLeft(2, '0');
    final m = local.month.toString().padLeft(2, '0');
    return '$d / $m / ${local.year}';
  }

  // ---------------------------------------------------------------------
  // Observations complémentaires de l'inspecteur (hors grille officielle)
  // ---------------------------------------------------------------------

  List<pw.Widget> _buildCustomObservations(FormTemplate template, FormDraft draft) {
    final sectionLabelById = <String, String>{
      for (final section in template.sections) section.id: '${section.code}. ${section.title}',
    };

    final rows = <List<String>>[];
    for (final sectionDraft in draft.sections) {
      for (final observation in sectionDraft.customObservations) {
        rows.add([
          sectionLabelById[sectionDraft.sectionId] ?? sectionDraft.sectionId,
          observation.label.isEmpty ? '—' : observation.label,
          observation.note,
        ]);
      }
    }

    if (rows.isEmpty) {
      return const [];
    }

    return [
      pw.SizedBox(height: 6),
      pw.Container(
        width: double.infinity,
        decoration: pw.BoxDecoration(border: pw.Border.all(width: 1.4, color: AppPdfColors.warning)),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Container(
              width: double.infinity,
              color: AppPdfColors.warning,
              padding: const pw.EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: pw.Text(
                "Observations complémentaires de l'inspecteur (hors grille officielle)",
                style: pw.TextStyle(color: PdfColors.white, fontWeight: pw.FontWeight.bold, fontSize: 9.5),
              ),
            ),
            pw.Padding(
              padding: const pw.EdgeInsets.all(4),
              child: pw.TableHelper.fromTextArray(
                headers: const ['Section', 'Observation', 'Note'],
                data: rows,
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 7.5),
                cellStyle: const pw.TextStyle(fontSize: 7.5),
                border: pw.TableBorder.all(width: 0.5, color: AppPdfColors.outline),
                cellPadding: const pw.EdgeInsets.symmetric(vertical: 2, horizontal: 3),
              ),
            ),
          ],
        ),
      ),
    ];
  }
}

class _CodedBlock {
  const _CodedBlock(this.code, this.widgets);

  final String? code;
  final List<pw.Widget> widgets;
}
